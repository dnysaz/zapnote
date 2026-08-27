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
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('zapnote-theme')||'emerald';var THEMES={emerald:{primary:'#234b42',dark:'#173b35',darker:'#254b43',active:'#2b574d',accent:'#c9e979',soft:'#d7e9d7',mid:'#477f67',card:'#214a41',cardBorder:'#3a665a',cardTrack:'#386257'},ocean:{primary:'#1e5f74',dark:'#12404f',darker:'#1a4f60',active:'#2a6b81',accent:'#7fd3e8',soft:'#d3e8ee',mid:'#3f7f94',card:'#16414f',cardBorder:'#2a5d6e',cardTrack:'#2a5d6e'},violet:{primary:'#5a4a9e',dark:'#3a2f6e',darker:'#4a3d85',active:'#6a5ab0',accent:'#c4b5f0',soft:'#e3def5',mid:'#7a6ab8',card:'#3f3472',cardBorder:'#5a4d9a',cardTrack:'#5a4d9a'},rose:{primary:'#a0405e',dark:'#7a2b45',darker:'#8d354f',active:'#b24d6b',accent:'#f0a5bb',soft:'#f3dde4',mid:'#c05f7b',card:'#7e2e47',cardBorder:'#a44d67',cardTrack:'#a44d67'},amber:{primary:'#a06a1e',dark:'#7a4e14',darker:'#8d5b17',active:'#b27c2b',accent:'#f0c77f',soft:'#f3e6d0',mid:'#c08a3a',card:'#7e5015',cardBorder:'#a46d2b',cardTrack:'#a46d2b'},slate:{primary:'#475569',dark:'#334155',darker:'#3d4c61',active:'#556880',accent:'#b8c4d4',soft:'#e2e7ed',mid:'#6b7f99',card:'#37465c',cardBorder:'#4d6078',cardTrack:'#4d6078'}};var c=THEMES[t];if(c){var r=document.documentElement;function mx(h,p){var n=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);var mr=Math.round(n+(255-n)*(p/100));var mg=Math.round(g+(255-g)*(p/100));var mb=Math.round(b+(255-b)*(p/100));return 'rgb('+mr+','+mg+','+mb+')';}var K=['primary','dark','darker','active','accent','soft','mid','card','cardBorder','cardTrack'];K.forEach(function(k){r.style.setProperty('--crm-'+k,c[k]);});r.style.setProperty('--crm-bg',mx(c.primary,95));r.style.setProperty('--crm-panel',mx(c.primary,97));r.style.setProperty('--crm-surface',mx(c.primary,96));r.style.setProperty('--crm-hover',mx(c.primary,92));r.style.setProperty('--crm-border',mx(c.primary,88));r.style.setProperty('--crm-border-soft',mx(c.primary,92));r.style.setProperty('--crm-border-input',mx(c.primary,87));r.style.setProperty('--crm-focus-ring',mx(c.primary,86));r.style.setProperty('--crm-focus-border',mx(c.primary,45));r.style.setProperty('--crm-brand',mx(c.primary,30));r.style.setProperty('--crm-avatar-bg',mx(c.primary,86));r.style.setProperty('--crm-danger',mx(c.primary,45));r.style.setProperty('--crm-danger-bg',mx(c.primary,88));r.style.setProperty('--crm-danger-border',mx(c.primary,78));}}catch(e){}`
          }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
