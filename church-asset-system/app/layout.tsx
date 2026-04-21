import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BCFCN Asset Database',
  description: 'Belize City First Church of the Nazarene asset management system'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
