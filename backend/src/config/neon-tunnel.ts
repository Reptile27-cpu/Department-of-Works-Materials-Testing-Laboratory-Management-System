import net from 'net';

const NEON_IPV4_POOL = ['3.141.122.14', '3.18.239.121', '18.189.49.143'];
const NEON_PORT = 5432;
const LOCAL_PORT = 5433;

let forwarderServer: net.Server | null = null;
let rrIndex = 0;

export function ensureNeonTunnel(): string {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl || !originalUrl.includes('neon.tech')) {
    return originalUrl || '';
  }

  // If already proxied, return
  if (originalUrl.includes('127.0.0.1:5433')) {
    return originalUrl;
  }

  // Parse connection string
  // Format: postgresql://USER:PASS@HOST-pooler.c-7.us-east-2.aws.neon.tech/DB?QUERY
  try {
    const url = new URL(originalUrl.replace('postgresql://', 'http://'));
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const db = url.pathname.slice(1);
    
    // Extract endpoint ID from host, e.g. "ep-weathered-mountain-b5lodhsl-pooler" -> "ep-weathered-mountain-b5lodhsl"
    const endpointId = host.split('.')[0].replace('-pooler', '');

    if (!forwarderServer) {
      forwarderServer = net.createServer((clientSocket) => {
        const targetIp = NEON_IPV4_POOL[rrIndex++ % NEON_IPV4_POOL.length];
        const targetSocket = net.connect({ host: targetIp, port: NEON_PORT }, () => {
          clientSocket.pipe(targetSocket);
          targetSocket.pipe(clientSocket);
        });

        targetSocket.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => targetSocket.destroy());
      });

      forwarderServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Tunnel is already running on port 5433 in another process (e.g., dev server)
          return;
        }
        console.warn('Neon tunnel server error:', err.message);
      });

      forwarderServer.listen(LOCAL_PORT, '127.0.0.1');
      forwarderServer.unref(); // Don't prevent process exit
    }

    // Rewrite to local forwarder with endpoint in password for SNI routing
    const tunnelUrl = `postgresql://${user}:endpoint=${endpointId}$${password}@127.0.0.1:${LOCAL_PORT}/${db}?sslmode=require&connect_timeout=15`;
    process.env.DATABASE_URL = tunnelUrl;
    return tunnelUrl;
  } catch (err) {
    console.warn('Failed to setup Neon tunnel, falling back to original URL:', err);
    return originalUrl;
  }
}

