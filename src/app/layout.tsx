import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { headers } from 'next/headers';
import { AuthProvider } from "@/components/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Analytics Pro",
  description: "Advanced analytics for your Whop business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const token = headersList.get('x-whop-user-token');

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider token={token}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
