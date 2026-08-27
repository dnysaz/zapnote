import type { CarouselTheme } from "../types";

/**
 * Theme 2 — "Hacker".
 * Latar hitam pekat, aksen neon (hijau/cyan), font mono, baris kode,
 * ikon dalam kotak terminal, judul uppercase.
 */
const theme: CarouselTheme = {
  id: "theme2",
  label: "Hacker",
  badge: "terminal · neon",
  tone: "dark",
  fontId: "mono",
  render: ({ card, index, total, brandName, palette, font, Icon }) => {
    const bg = "#050505";
    const accent = palette.accent;
    const dim = "rgba(255,255,255,.55)";
    const isLast = index === total - 1;

    return (
      <div style={{ width: 1080, height: 1350, background: bg, color: "#ffffff", fontFamily: font.stack, display: "flex", flexDirection: "column", padding: "64px 60px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        {/* Scanline glow */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 420, height: 420, borderRadius: 999, background: accent, opacity: 0.08 }} />

        {/* Terminal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `2px solid ${accent}`, padding: "20px 24px", borderRadius: 14 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: accent, letterSpacing: 2 }}>~/{brandName.toLowerCase()}</span>
          <span style={{ fontSize: 22, color: dim }}>{String(index + 1).padStart(2, "0")}:{String(total).padStart(2, "0")}</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 96, height: 96, borderRadius: 12, border: `2px solid ${accent}`, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={52} color={accent} strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: 22, color: dim }}>root@zapnote:~$ ./generate</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 84, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1, textTransform: "uppercase", color: "#ffffff" }}>{card.title}</h1>
          {card.body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {card.body.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <span style={{ color: accent, fontSize: 20 }}>&gt; 0{i + 1}</span>
                  <span style={{ fontSize: 30, lineHeight: 1.4, color: dim }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer terminal bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${accent}`, paddingTop: 22 }}>
          <span style={{ fontSize: 22, color: accent }}>{isLast ? "[ OK ] END OF LINE" : "[ OK ] NEXT →"}</span>
          <span style={{ fontSize: 20, color: dim }}>▮</span>
        </div>
      </div>
    );
  },
};

export default theme;
