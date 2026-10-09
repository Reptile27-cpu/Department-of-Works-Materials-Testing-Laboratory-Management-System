import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'Department of Works Laboratory Management System',
    template: '%s | DoW Lab System',
  },
  description: 'Civil engineering materials testing, geotechnical analysis, and official laboratory certification system for the Papua New Guinea Department of Works.',
  keywords: [
    'Department of Works',
    'DoW Lab System',
    'Papua New Guinea',
    'materials testing',
    'soil mechanics',
    'civil engineering',
    'geotechnical laboratory',
    'AS 1289',
    'ASTM'
  ],
  authors: [{ name: 'PNG Department of Works | Central Materials Testing Division' }],
  openGraph: {
    title: 'Department of Works Laboratory Management System',
    description: 'Civil engineering materials testing and quality assurance platform for Papua New Guinea infrastructure projects',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
