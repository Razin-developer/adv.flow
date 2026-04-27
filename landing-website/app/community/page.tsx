import type { Metadata } from "next";
import CommunityExperience from "@/components/product/CommunityExperience";

export const metadata: Metadata = {
  title: "Community | Advflow",
  description: "Reddit-style discussions for Advflow workflows, macros, bugs, ideas, and showcases.",
};

export default function CommunityPage() {
  return <CommunityExperience />;
}

