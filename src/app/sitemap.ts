import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zapnote.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Landing page — highest priority
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Share pages — public, crawlable
    {
      url: `${baseUrl}/share/article/[id]`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/share/note/[id]`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
