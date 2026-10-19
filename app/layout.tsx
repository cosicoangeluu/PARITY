import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (OFL fonts from Fontsource), so builds never depend on reaching Google Fonts.
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-latin.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const geist = localFont({
  src: "./fonts/Geist-latin.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Parity: split it fair, settle it fast", template: "%s · Parity" },
  description:
    "Scan the receipt, share one link, and everyone ticks what they had. Free, no sign-up, GCash and Maya ready.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#10202E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
