import type { Metadata } from "next";
import DocsExperience from "@/components/product/DocsExperience";

export const metadata: Metadata = {
  title: "Docs | Advflow",
  description: "Guides, examples, and command references for Advflow desktop automation.",
};

export default function DocsPage() {
  return <DocsExperience />;
}

