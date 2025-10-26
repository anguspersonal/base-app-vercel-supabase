import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Base App - Next.js + Supabase + Vercel",
  description: "A reusable full-stack starter with Next.js, Supabase, and Vercel",
  keywords: ["Next.js", "Supabase", "Vercel", "TypeScript", "React"],
  authors: [{ name: "Base App Team" }],
  openGraph: {
    title: "Base App - Next.js + Supabase + Vercel",
    description: "A reusable full-stack starter with Next.js, Supabase, and Vercel",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950`}>
        {children}
      </body>
    </html>
  );
}
