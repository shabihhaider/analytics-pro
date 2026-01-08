import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { headers } from 'next/headers';
import { InitUser } from '@/components/init-user';

// CRITICAL: Force dynamic rendering to ensure headers() reads fresh request headers
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Analytics Pro",
  description: "Whop Analytics Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CRITICAL: Extract token from initial request
  // Whop sends it in x-whop-user-token header when app loads in iframe
  const headersList = headers();
  const token = headersList.get('x-whop-user-token') || '';

  // Debug: Log token presence (check Vercel Function Logs)
  console.log('[Layout] Token captured:', token ? `YES (${token.substring(0, 20)}...)` : 'NO/EMPTY');

  return (
    <html lang="en">
      <head>
        {/* Inject token into page for client-side API calls */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__WHOP_TOKEN__ = ${JSON.stringify(token)};`,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Initialize user in DB during page load */}
        <InitUser />
        {children}
      </body>
    </html>
  );
}

