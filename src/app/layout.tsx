
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Corrected import from next/font/google
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { siteConfig } from '@/config/site';

const geistSans = Geist({ // Correct usage for next/font/google
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({ // Correct usage for next/font/google
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico", // Standard favicon
    apple: "/apple-touch-icon.png", // Example for Apple touch icon, ensure file exists in /public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#9466FF" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
