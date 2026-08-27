import type { Metadata } from "next";
import { LandingContent } from "@/components/LandingContent";

export const metadata: Metadata = {
  title: "ZapNote! — AI-Powered Note Taking | Free Notes, Articles, Carousels",
  description: "ZapNote is your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI. Write smarter, create faster, analyze deeper. Free forever for basic usage.",
  keywords: [
    "note taking app",
    "AI notes",
    "free note app",
    "content creation tool",
    "article generator AI",
    "carousel creator",
    "SWOT analysis tool",
    "project notes",
    "productivity app",
    "Gemini AI notes",
    "rich text editor",
    "markdown editor",
    "secure notes",
    "BYOK notes",
    "content strategy tool",
    "social media carousel",
    "SEO analysis",
    "AI writing assistant",
  ],
  openGraph: {
    title: "ZapNote! — AI-Powered Note Taking",
    description: "Your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI. Free forever for basic usage.",
    url: "/",
    siteName: "ZapNote!",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ZapNote! — AI-Powered Note Taking Workspace",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZapNote! — AI-Powered Note Taking",
    description: "Your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI.",
    images: ["/og.png"],
    creator: "@zapnote",
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "application-name": "ZapNote!",
    "og:image:width": "1200",
    "og:image:height": "630",
  },
};

export default function LandingPage() {
  return <LandingContent />;
}
