import type { Metadata } from "next";
import DocsExperience from "@/components/product/DocsExperience";

export const metadata: Metadata = {
  title: "Docs",
  description: "Guides, examples, and command references for Adv.Flow desktop automation.",
};

export default function DocsPage() {
  return <DocsExperience />;
}
