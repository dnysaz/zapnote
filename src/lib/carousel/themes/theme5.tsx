import type { CarouselTheme } from "../types";

/**
 * Theme 5 — "Soft Pastel".
 * Soft pastel background, round icon in an accent ring, bold rounded title,
 * points as soft chips, counter badge. Clean & warm.
 */
const theme: CarouselTheme = {
  id: "theme5",
  label: "Soft Pastel",
  badge: "pastel · lembut",
  tone: "light",
  fontId: "poppins",
  render: ({ card, index, total, brandName, palette, tone, font, Icon }) => {
    const light = tone === "light";
    const bg = light ? palette.lightBg : palette.darkBg;
    const text = light ? palette.deep : "#ffffff";
    const sub = light ? palette.deep + "cc" : "rgba(255,255,255,.75)";
    const isLast = index === total - 1;

    return (
      <div style={{ width: 1080, height: 1350, background: bg, color: text, fontFamily: font.stack, display: "flex", flexDirection: "column", padding: "72px 64px", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ background: palette.accent + "33", color: text, padding: "12px 28px", borderRadius: 999, fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>{brandName}</span>
          <span style={{ width: 56, height: 56, borderRadius: 999, background: palette.accent, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>{index + 1}</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
          <div style={{ width: 180, height: 180, borderRadius: 999, border: `8px solid ${palette.accent}`, background: palette.accent + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={88} color={palette.accent} strokeWidth={1.8} />
          </div>
          <h1 style={{ margin: 0, fontSize: 84, fontWeight: 800, lineHeight: 1.14, letterSpacing: -1.5 }}>{card.title}</h1>
          {card.body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {card.body.map((line, i) => (
                <div key={i} style={{ background: palette.accent + "1f", borderRadius: 18, padding: "18px 26px", display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: palette.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 32, lineHeight: 1.4, color: sub }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span style={{ background: palette.accent, color: "#ffffff", borderRadius: 999, padding: "14px 34px", fontSize: 24, fontWeight: 800 }}>
            {isLast ? "Thank you ✦" : "Next →"}
          </span>
        </div>
      </div>
    );
  },
};

export default theme;
