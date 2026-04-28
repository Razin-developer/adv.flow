import type { MetadataRoute } from "next";

const baseUrl = "https://advflow.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/download", "/features", "/community", "/docs"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
