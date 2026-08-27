import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved. Go back to ZapNote.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.05]">
          <FileQuestion size={36} className="text-white/20" />
        </div>
        <h1 className="mt-6 text-6xl font-bold tracking-[-.05em] text-white">404</h1>
        <p className="mt-3 text-lg text-white/40">Page not found</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/25">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#234b42]/20 transition-all hover:shadow-xl hover:shadow-[#234b42]/30"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <Link
            href="/app/notes"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/50 transition-all hover:border-white/20 hover:text-white/70"
          >
            <ArrowLeft size={16} />
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}
