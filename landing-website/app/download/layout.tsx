import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download the latest Adv.Flow desktop builds for Windows, macOS, and Linux, with install notes and CLI setup guidance.",
  alternates: {
    canonical: "/download",
  },
};

export default function DownloadLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
