// Sections 20-21: Detail hero fade
// 20. Detail hero: strong black left-fade over the playing clip on mobile,
// matching the desktop shade and the older version's look so the
// title/synopsis stay readable. Covers BOTH video paths: the
// random-local-clip shade (the mobile override had only a weak top
// fade) and the opening-theme trailer layer (which had no shade at all).
html = html.replace(
  `.local-clip-preview.detail .clip-shade{background:linear-gradient(#08090b2e 0%,#08090bc2 48%,#08090b 92%)}`,
  `.local-clip-preview.detail .clip-shade{background:linear-gradient(90deg,#08090b 0%,#08090bd6 18%,#08090b47 58%,#08090b1f 100%),linear-gradient(#0000 66%,#08090b 100%)}.local-clip-preview.detail .trailer-preview-layer::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#08090b 0%,#08090bd6 18%,#08090b47 58%,#08090b1f 100%),linear-gradient(#0000 66%,#08090b 100%)}`
);

// 21. Detail hero trailer fade on desktop/tablet too: the opening-theme
// layer had no shade on wide screens, so the title/synopsis sat on the
// bright backdrop. Same strong left fade as mobile (patch #20).
html = html.replace(
  `.local-clip-preview.detail{z-index:0;left:48%}`,
  `.local-clip-preview.detail{z-index:0;left:48%}.local-clip-preview.detail .trailer-preview-layer::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#08090b 0%,#08090bd6 18%,#08090b47 58%,#08090b1f 100%),linear-gradient(#0000 66%,#08090b 100%)}`
);

fs.writeFileSync("www/index.html", html, "utf8");
