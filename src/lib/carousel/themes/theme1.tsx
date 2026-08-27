import type { CarouselTheme } from "../types";

/**
 * Theme 1 — "Minimal Mono".
 * Clean black & white: thin-line icon on the left, big sans-serif title,
 * numbered rows with hairlines, lots of whitespace.
 */
const theme: CarouselTheme = {
  id: "theme1",
  label: "Minimal Mono",
  badge: "hitam putih · bersih",
  tone: "light",
  fontId: "inter",
  render: ({ card, index, total, brandName, palette, tone, font, Icon }) => {
    const light = tone === "light";
    const bg = light ? palette.lightBg : palette.darkBg;
    const text = light ? palette.deep : "#ffffff";
    const sub = light ? palette.deep + "aa" : "rgba(255,255,255,.7)";
    const isLast = index === total - 1;

    return (
      <div style={{ width: 1080, height: 1350, background: bg, color: text, fontFamily: font.stack, display: "flex", flexDirection: "column", padding: "76px 72px", boxSizing: "border-box" }}>
        {/* Top: icon + brand + counter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Icon size={44} color={text} strokeWidth={1.5} />
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, color: sub, textTransform: "uppercase" }}>{brandName}</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 600, color: sub }}>{String(index + 1).padStart(2, "0")}</span>
        </div>

        {/* Center content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40, padding: "0 24px" }}>
          <h1 style={{ margin: 0, fontSize: 92, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>{card.title}</h1>
          {card.body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {card.body.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "20px 0", borderBottom: `1px solid ${sub}` }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: sub }}>0{i + 1}</span>
                  <span style={{ fontSize: 34, lineHeight: 1.4, color: sub }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px" }}>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, color: sub, textTransform: "uppercase" }}>{isLast ? "End" : "Next →"}</span>
          <span style={{ fontSize: 20, color: sub }}>{total} cards</span>
        </div>
      </div>
    );
  },
};

export default theme;
