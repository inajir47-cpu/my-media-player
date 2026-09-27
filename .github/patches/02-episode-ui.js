// Sections 7-11: Episode UI, continue watching, history tab
// 7. Episode & Watch Order UI enhancements (listed count + arrive date)
html = html.replace(
  /children:\s*\[u\("h3",\s*\{\s*children:\s*r\s*==\s*null\s*\?\s*"Episodes"\s*:\s*ve\(r\)\s*\}\)/,
  'children: [u("h3", { children: (r == null ? "Episodes" : ve(r)) + (U.length > 0 ? ` · ${U.length} listed` : " · 0 listed") })'
);

html = html.replace(
  /oa = f\.kind === "season" \? `\$\{S\.episodes\.filter\(I => I\.seasonNumber === f\.season\.seasonNumber\)\.length\} episodes` : f\.kind === "related" \? f\.related\.title : f\.file\.displayTitle;/,
  'oa = f.kind === "season" ? (f.season.statusText ? `${f.season.statusText} · ${S.episodes.filter(I => I.seasonNumber === f.season.seasonNumber).length} listed` : `${S.episodes.filter(I => I.seasonNumber === f.season.seasonNumber).length} episodes listed`) : f.kind === "related" ? (f.related.statusText ? `${f.related.statusText} · ${f.related.title}` : f.related.title) : f.file.displayTitle;'
);

html = html.replace(
  /children:\s*\[f\.runtimeMinutes\s*\?\s*`\$\{f\.runtimeMinutes\}\s*min`[\s\S]*?" · No local file"\]/,
  'children: [f.arriveDate ? (f.isUpcoming ? `Arrives ${f.arriveDate} · ` : `${f.arriveDate} · `) : "", f.airStatus ? f.airStatus : (f.runtimeMinutes ? `${f.runtimeMinutes} min` : "24 min"), X ? (Oe ? (C && C.positionSeconds > 3 && !C.completed ? " · Resume" : " · Ready to play") : " · Reconnect file") : (f.isUpcoming ? " · Coming soon" : " · No local file")]'
);

html = html.replace(
  /return `Season \$\{lt\.get\(f\) \?\? f\}\$\{C\?\.releaseYear \? ` \(\$\{C\.releaseYear\}\)` : ""\}`;/,
  'return `Season ${lt.get(f) ?? f}${C?.releaseYear ? ` (${C.releaseYear})` : ""}${C?.badgeText ? ` · ${C.badgeText}` : ""}`;'
);

html = html.replace(
  '"No episode list was found for this season. Your imported files are still kept."',
  '(Me.find(ae => ae.seasonNumber === r)?.isComingSoon ? "⏳ Coming Soon — This season has been announced and has not started airing yet." : "No episode list was found for this season. Your imported files are still kept.")'
);

// 8. Auto-select the Season where the user left off when opening a Series detail page
html = html.replace(
  'if (r == null && D[0] != null) o(D[0]);',
  'if (r == null && D[0] != null) { var lastWatchedSeason = window.__getLastWatchedSeason ? window.__getLastWatchedSeason(S) : null; o(lastWatchedSeason != null && D.includes(lastWatchedSeason) ? lastWatchedSeason : D[0]); }'
);

// 9. Add "Continue Watching (S01 E02)" button inside Series / Movie Detail Hero Actions
html = html.replace(
  /_\s*\[0\]\s*&&\s*v\("button",\s*\{\s*className:\s*"primary-action"[\s\S]*?"Play local file"\]\s*\}\)/,
  '(window.__renderDetailContinueButton ? window.__renderDetailContinueButton(S, i, o, c, u, v, k) : null)'
);

// 10. Add "History" tab button to Top Navigation Bar
html = html.replace(
  /u\("button",\s*\{\s*className:\s*a\s*===\s*"music"\s*\?\s*"active"\s*:\s*"",\s*onClick:\s*\(\)\s*=>\s*i\("music"\),\s*children:\s*"Music"\s*\}\)/,
  'u("button", { className: a === "music" ? "active" : "", onClick: () => i("music"), children: "Music" }), u("button", { className: a === "history" ? "active" : "", onClick: () => i("history"), children: "History" })'
);

// 11. Inject "Continue Watching" rail BEFORE "Series collections" on Home AND full "History" tab view
html = html.replace(
  'u("div", {\n          className: "rail-stack",',
  '(window.__renderContinueAndHistory ? window.__renderContinueAndHistory({ activeTab: a, setTab: i, searchQuery: e, cwItems: A.data?.items ?? [], collections: R, onPlay: ra, onOpenCollection: o, u: u, v: v, k: k }) : null), a !== "history" && u("div", {\n          className: "rail-stack",'
);

// 11b. Merge watched online series/movies INTO the native Series collections / Movies rows
html = html.replace(
  'children: [["series", "Series collections", U], ["movie", "Movies", _], ["music", "Music", ue]]',
  'children: [["series", "Series collections", window.__onlineCols ? U.concat(window.__onlineCols("series")) : U], ["movie", "Movies", window.__onlineCols ? _.concat(window.__onlineCols("movie")) : _], ["music", "Music", ue]]'
);

// 11c. Route taps on online collection cards to the online detail page
html = html.replace(
  'onOpen: () => o(f.id),',
  'onOpen: () => { window.__nativeOpenCollection = o; var __fid = String((f && f.id) || ""); if (__fid.indexOf("online:") === 0) { if (window.__openOnlineCol) window.__openOnlineCol(__fid.slice(7)); } else { o(f.id); } },'
);

