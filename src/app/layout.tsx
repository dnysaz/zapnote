import type { Metadata } from "next";
import { DM_Sans, Geist, Space_Mono } from "next/font/google";
import { SettingsProvider } from "@/components/SettingsProvider";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: DEFAULT_SETTINGS.siteName,
  description: "Your personal notes app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${dmSans.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
