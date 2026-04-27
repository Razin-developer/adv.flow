import AnalyticsTracker from "@/components/AnalyticsTracker";
import LandingPage from "@/components/landing/LandingPage";

const githubRepo = "Razin-developer/adv.flow";

async function getStarCount(): Promise<string> {
  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return "Star";
    }

    const data = (await response.json()) as { stargazers_count?: number };
    const count = data.stargazers_count ?? 0;

    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }

    return String(count);
  } catch {
    return "Star";
  }
}

export default async function HomePage() {
  const stars = await getStarCount();

  return (
    <main>
      <AnalyticsTracker pathname="/" />
      <LandingPage stars={stars} />
    </main>
  );
}
