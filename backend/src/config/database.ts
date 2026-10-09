import { PrismaClient } from '@prisma/client';
import { ensureNeonTunnel } from './neon-tunnel';

// Ensure IPv4 tunnel for Neon on environments where IPv6 hangs
ensureNeonTunnel();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

