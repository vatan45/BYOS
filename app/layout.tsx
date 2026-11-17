import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BYOS | Bring Your Own Storage — S3 Compatible Object Storage on Google Drive",
  description: "Turn your Google Drive into a high-performance, S3-compatible object storage platform with zero cloud vendor markups, O(1) indexed metadata, and cryptographic streaming grants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-stone-950 text-stone-100 min-h-screen selection:bg-emerald-400 selection:text-stone-950 antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
