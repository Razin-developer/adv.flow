import type { Metadata } from "next";
import FeaturesExperience from "@/components/product/FeaturesExperience";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Adv.Flow workflows, macros, in-app automation, CLI integrations, AI generation, browser automation, and commands.",
};

export default function FeaturesPage() {
  return <FeaturesExperience />;
}
