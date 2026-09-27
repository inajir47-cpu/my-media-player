// Sections 15-17: Random clips, detail container, continue watching
// 15. Random local clip: 30s play time + smooth fade-out/fade-in between clips
html = html.replace(
  '[g, b] = H(null);',
  '[g, b] = H(null),' + '\n' + '    [fading, setFading] = H(false);'
);
html = html.replace(
  'randomValue: Math.random()' + '\n' + '    });' + '\n' + '  }' + '\n' + '  if (Ee(() => {',
  'randomValue: Math.random()' + '\n' + '    });' + '\n' + '  }' + '\n' + '  function switchClip() {' + '\n' + '    if (fading) return;' + '\n' + '    setFading(true);' + '\n' + '    setTimeout(() => {' + '\n' + '      h();' + '\n' + '      setTimeout(() => setFading(false), 80);' + '\n' + '    }, 450);' + '\n' + '  }' + '\n' + '  if (Ee(() => {'
);
html = html.replace(
  'if (y.currentTarget.currentTime - s.current >= 12) h();',
  'if (y.currentTarget.currentTime - s.current >= 30) switchClip();'
);
html = html.replace('onEnded: h,', 'onEnded: switchClip,');
html = html.replace(
  'className: `local-clip-preview ' + '${l}' + '`,',
  'className: `local-clip-preview ' + '${l}${fading ? " clip-fading" : ""}' + '`,',
);
html = html.replace(
  '</head>',
  '<style>.local-clip-preview video{transition:opacity .45s ease}.local-clip-preview.clip-fading video{opacity:0}</style></head>'
);

// 16. Detail/info page: always render the clip preview container so the
// opening-theme fallback (syncContainerTrailer '.detail-hero') can attach
// when no local video exists. With local files nothing changes (random
// clip plays as before); without them the container renders .empty and
// the existing CSS already hides the placeholder once the theme plays.
html = html.replace(
  'children: [ue && u(To, {',
  'children: [u(To, {'
);
// 17. Continue Watching: expose a real refetch for the Home rail so
// online watches appear on Home the moment the player closes.
// (closePlayerShell called window.__refreshContinueWatching, but it was
// never defined, and the aw-continue-refresh event had no listener.)
html = html.replace(
  'A = ca({\n      queryKey: ["continue-watching"],\n      queryFn: () => it.listContinueWatching({\n        limit: 12\n      })\n    });',
  'A = ca({\n      queryKey: ["continue-watching"],\n      queryFn: () => it.listContinueWatching({\n        limit: 12\n      })\n    });\n    try { window.__refreshContinueWatching = function(){ try { A.refetch(); } catch(e){} }; } catch(e){}'
);
