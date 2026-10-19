import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SourceChat — Answers with a paper trail',
  description:
    'Explore AI streaming and source citations with a local knowledge base.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
