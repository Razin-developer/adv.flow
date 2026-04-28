import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const siteName = "Adv.Flow";
const siteUrl = "https://advflow.dev";
const siteDescription =
  "Adv.Flow is an open-source desktop automation workspace for repeatable workflows, macros, AI-assisted setup, and CLI runs across Windows, macOS, and Linux.";
const socialImage = "/social-share.svg";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Desktop Automation Workflows`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  referrer: "origin-when-cross-origin",
  keywords: [
    "Adv.Flow",
    "desktop automation",
    "workflow automation",
    "developer tools",
    "macros",
    "Tauri app",
    "CLI automation",
    "local workflows",
    "Windows automation",
    "macOS automation",
    "Linux automation",
  ],
  authors: [{ name: "Razin" }],
  creator: "Razin",
  publisher: "Adv.Flow",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/advflow-logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${siteName} | Desktop Automation Workflows`,
    description: siteDescription,
    siteName,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "Adv.Flow desktop automation workflows",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Desktop Automation Workflows`,
    description: siteDescription,
    images: [socialImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
