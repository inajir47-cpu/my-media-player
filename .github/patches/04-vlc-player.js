// Section 13: VLC player upgrades
// 13. Upgrade VLC Player (rg) with YouTube Pinch-to-Zoom, Fit/Fill/Stretch, Swipe-Down Mini-Player & System PiP
html = html.replace(
  'className: `player-modal vlc-player ${bt ? "" : "controls-hidden"}`,',
  'className: `player-modal vlc-player ${bt ? "" : "controls-hidden"} ${window.__isMiniPlayer ? "yt-mini-player" : ""}`,'
);

html = html.replace(
  'u("button", {\n        onClick: wg,\n        "aria-label": "Close player",\n        children: u(k, {\n          name: "close"\n        })\n      })',
  'v("div", { className: "yt-toolbar-actions", children: [u("button", { type: "button", className: "yt-pill-btn", onClick: () => window.__toggleMiniPlayer && window.__toggleMiniPlayer(g.current), "aria-label": "Miniplayer", children: "⌄ Mini" }), u("button", { type: "button", className: "yt-pill-btn", onClick: () => window.__cycleVideoFit && window.__cycleVideoFit(c.current, pl), "aria-label": "Toggle screen fit", children: "⤢ Fit / Zoom" }), u("button", { type: "button", className: "yt-pill-btn", onClick: () => window.__enterVideoPiP && window.__enterVideoPiP(c.current, g.current), "aria-label": "Picture in Picture", children: "⧉ PiP" }), u("button", { type: "button", onClick: () => { if (window.__setMiniPlayerMode) window.__setMiniPlayerMode(false, g.current); wg(); }, "aria-label": "Close player", children: u(k, { name: "close" }) })] })'
);

html = html.replace(
  'className: "player-stage",\n      onPointerDown: mg,\n      onPointerMove: gg,\n      onPointerUp: yg,\n      onPointerCancel: vg,',
  'className: "player-stage",\n      onTouchStart: w => window.__stageTouchStart && window.__stageTouchStart(w, c.current, g.current),\n      onTouchMove: w => window.__stageTouchMove && window.__stageTouchMove(w, c.current, g.current, pl),\n      onTouchEnd: w => window.__stageTouchEnd && window.__stageTouchEnd(w, c.current, g.current, pl),\n      onPointerDown: w => { if (window.__isMiniPlayer) { window.__setMiniPlayerMode(false, g.current); return; } if (window.__pinchActive) return; mg(w); },\n      onPointerMove: w => { if (window.__isMiniPlayer || window.__pinchActive) return; gg(w); },\n      onPointerUp: w => { if (window.__isMiniPlayer || window.__pinchActive) return; yg(w); },\n      onPointerCancel: vg,'
);

html = html.replace(
  'let w = window.setTimeout(() => Dc(!1), 6000);',
  'if (window.__enterPlayerImmersive) window.__enterPlayerImmersive(true);\n    let w = window.setTimeout(() => Dc(!1), 6000);'
);

html = html.replace(
  'if (He) URL.revokeObjectURL(He);\n    };',
  'if (window.__enterPlayerImmersive) window.__enterPlayerImmersive(false);\n      if (He) URL.revokeObjectURL(He);\n    };'
);

