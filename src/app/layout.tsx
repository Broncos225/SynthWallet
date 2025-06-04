
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
  manifest: "/manifest.json", // Link to the manifest file
  // PWA specific meta tags for iOS
  appleWebAppCapable: "yes", // Maintained for wider iOS compatibility if needed
  appleWebAppStatusBarStyle: "default", // or "black", "black-translucent"
  appleWebAppTitle: siteConfig.name,
  icons: {
    icon: "/favicon.ico", // Standard favicon
    apple: "/apple-touch-icon.png", // Example for Apple touch icon, ensure file exists in /public
    // You can add other sizes or types here if needed
    // shortcut: '/shortcut-icon.png',
    // other: [
    //   { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16' },
    //   { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32' },
    // ],
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
        {/* It's common to also add theme-color meta tag for immediate effect */}
        <meta name="theme-color" content="#9466FF" />
        {/* Add meta tags for PWA behavior on iOS and Android */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
        {/* Add links for Apple touch icons if you have them in /public */}
        {/* e.g., <link rel="apple-touch-icon" href="/apple-icon-180x180.png" sizes="180x180" /> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
