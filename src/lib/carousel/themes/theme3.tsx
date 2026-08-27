import type { CarouselTheme } from "../types";

/**
 * Theme 3 — "Blobs".
 * Colorful gradient blobs as the background, floating icon in the center,
 * big title on a clean area, points in rounded chips. Playful & colorful.
 */
const theme: CarouselTheme = {
  id: "theme3",
  label: "Blobs",
  badge: "gradasi · colorful",
  tone: "dark",
  fontId: "poppins",
  render: ({ card, index, total, brandName, palette, tone, font, Icon }) => {
    const isLast = index === total - 1;
    const blobs = [
      { top: -120, left: -100, size: 460, c1: palette.accent, c2: palette.deep },
      { top: -60, right: -80, size: 380, c1: palette.deep, c2: palette.accent },
      { bottom: -140, right: -60, size: 520, c1: palette.accent, c2: palette.deep },
      { bottom: -40, left: -120, size: 300, c1: palette.deep, c2: palette.accent },
    ];

    return (
      <div style={{ width: 1080, height: 1350, background: tone === "light" ? palette.lightBg : palette.darkBg, color: "#ffffff", fontFamily: font.stack, display: "flex", flexDirection: "column", padding: "72px 64px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        {/* Gradient blobs */}
        {blobs.map((b, i) => (
          <div key={i} style={{ position: "absolute", ...(b.top !== undefined ? { top: b.top } : {}), ...(b.bottom !== undefined ? { bottom: b.bottom } : {}), ...(b.left !== undefined ? { left: b.left } : {}), ...(b.right !== undefined ? { right: b.right } : {}), width: b.size, height: b.size, borderRadius: 999, background: `linear-gradient(135deg, ${b.c1}, ${b.c2})`, opacity: 0.9, filter: "blur(2px)" }} />
        ))}

        {/* Top row */}
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>{brandName.toUpperCase()}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{index + 1}/{total}</span>
        </div>

        {/* Content */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 36 }}>
          <div style={{ width: 190, height: 190, borderRadius: 999, background: "rgba(255,255,255,.22)", border: "4px solid rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <Icon size={92} color="#ffffff" strokeWidth={2} />
          </div>
          <h1 style={{ margin: 0, fontSize: 80, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, textShadow: "0 4px 30px rgba(0,0,0,.25)" }}>{card.title}</h1>
          {card.body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
              {card.body.map((line, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.2)", padding: "16px 32px", borderRadius: 999, backdropFilter: "blur(4px)" }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,.95)" }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{isLast ? "✦ Thank you ✦" : "Swipe →"}</span>
        </div>
      </div>
    );
  },
};

export default theme;
