import type { CarouselTheme } from "../types";

/**
 * Theme 4 — "Vivid Solid".
 * One solid color background, giant Impact uppercase typography,
 * icon in an accent box, numbered points. Bold poster style.
 */
const theme: CarouselTheme = {
  id: "theme4",
  label: "Vivid Solid",
  badge: "solid color · poster",
  tone: "dark",
  fontId: "impact",
  render: ({ card, index, total, brandName, palette, tone, font, Icon }) => {
    const light = tone === "light";
    const bg = light ? palette.lightBg : palette.darkBg;
    const text = light ? palette.deep : "#ffffff";
    const accent = palette.accent;
    const isLast = index === total - 1;

    return (
      <div style={{ width: 1080, height: 1350, background: bg, color: text, fontFamily: font.stack, display: "flex", flexDirection: "column", padding: "68px 64px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        {/* Giant faint number */}
        <div style={{ position: "absolute", top: -30, right: -10, fontSize: 420, fontWeight: 900, lineHeight: 1, color: accent, opacity: 0.16 }}>{index + 1}</div>

        {/* Top: brand + accent bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{brandName}</span>
          <span style={{ width: 60, height: 12, background: accent }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 44 }}>
          <div style={{ width: 170, height: 170, background: accent, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
            <Icon size={86} color={light ? "#ffffff" : palette.deep} strokeWidth={2.2} />
          </div>
          <h1 style={{ margin: 0, fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: -1, textTransform: "uppercase" }}>{card.title}</h1>
          {card.body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {card.body.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, color: accent }}>{i + 1}</span>
                  <span style={{ fontSize: 36, lineHeight: 1.35, color: light ? palette.deep : "rgba(255,255,255,.85)", fontWeight: 700 }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `8px solid ${accent}`, paddingTop: 24 }}>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{isLast ? "Follow" : "Swipe →"}</span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
        </div>
      </div>
    );
  },
};

export default theme;
