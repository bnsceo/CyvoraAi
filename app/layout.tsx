import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import PwaBootstrap from "@/components/PwaBootstrap";
import AppShell from "@/components/AppShell";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cyvora · AI Command Center",
  description: "Autonomous business operating system for the Anderson founder stack",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <head>
        <meta name="theme-color" content="#070b12" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/cyvora-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/cyvora-icon.svg" />
      </head>
      <body className="min-h-full overflow-x-hidden">
        {process.env.NODE_ENV === 'production' ? <PwaBootstrap /> : null}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
