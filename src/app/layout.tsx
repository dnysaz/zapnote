import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist, Space_Mono } from "next/font/google";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", weight: ["400", "700"], subsets: ["latin"] });

const siteName = DEFAULT_SETTINGS.siteName;
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zapnote.xyz";
const description = "ZapNote is your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI. Write smarter, create faster, analyze deeper.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteName} — AI-Powered Note Taking`,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "note taking app",
    "AI notes",
    "content creation",
    "article generator",
    "carousel creator",
    "SWOT analysis",
    "project notes",
    "productivity app",
    "Gemini AI",
    "BYOK",
    "secure notes",
    "free note app",
    "markdown editor",
    "rich text editor",
    "content strategy",
    "social media carousel",
    "SEO analysis",
  ],
  authors: [{ name: "ZapNote!" }],
  creator: "ZapNote!",
  publisher: "ZapNote!",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName,
    title: `${siteName} — AI-Powered Note Taking`,
    description: "Your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI.",
    images: [
      {
        url: `${baseUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: `${siteName} — AI-Powered Note Taking`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — AI-Powered Note Taking`,
    description: "Your all-in-one workspace for notes, articles, carousels, and content strategy — powered by Gemini AI.",
    images: [`${baseUrl}/og.png`],
    creator: "@zapnote",
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
  alternates: {
    canonical: baseUrl,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": siteName,
    "application-name": siteName,
    "msapplication-TileColor": "#234b42",
    "msapplication-tap-highlight": "no",
    "mobile-web-app-capable": "yes",
    "theme-color": "#234b42",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${dmSans.variable} ${spaceMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Preconnect to external origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: siteName,
              description,
              url: baseUrl,
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Smart Notes with rich-text editor",
                "AI Assistant powered by Gemini",
                "Social Media Carousel Creator",
                "Article Generator with SEO optimization",
                "SWOT Analysis tool",
                "Export to PDF, Word, TXT",
                "6 beautiful themes",
                "End-to-end encryption for API keys",
              ],
              screenshot: `${baseUrl}/og.png`,
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "150",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
