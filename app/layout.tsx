import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatPulse",
  description: "Real-time team chat",
};

/**
 * `viewport-fit=cover` lets the layout extend edge-to-edge so the CSS
 * `env(safe-area-inset-*)` values are populated on the Android app (CHAA-56);
 * the app chrome then pads itself clear of the notch and gesture-nav bar. The
 * theme colour matches the app header so the status bar blends in.
 */
export const viewport: Viewport = {
  themeColor: "#1F2C34",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
