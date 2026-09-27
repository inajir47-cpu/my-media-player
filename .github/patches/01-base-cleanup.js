// Sections 1-6: Cleanup, folder picker, title bar
// 1. Remove Muse iframe bridge scripts
html = html.replace(/<script data-hatch-cvm-opaque-url-compat[\s\S]*?<\/script>/, "");
html = html.replace(/<script data-hatch-cvm-bridge[\s\S]*?<\/script>/, "");

// 2. Clear static HTML snapshot so React mounts cleanly
html = html.replace(
  /(<div class="hatch-space-root" data-hatch-space-root="true">)[\s\S]*?(<\/div><\/div>\s*<script data-hatch-cvm-bundle)/,
  "$1$2"
);

// 3. Patch IndexedDB & localMedia in bundle to key by (webkitRelativePath || name)
html = html.replace(
  /for \(let r of e\) n\.put\(\{[\s\S]*?savedAt: Date\.now\(\)\s*\}\);/,
  'for (let r of e) { let k = window.__getMediaFileKey ? window.__getMediaFileKey(r) : (r.webkitRelativePath || r.name); n.put({ name: k, rawName: r.name, relativePath: r.webkitRelativePath || null, type: r.type, blob: r, savedAt: Date.now() }); if (k !== r.name) n.put({ name: r.name, rawName: r.name, relativePath: r.webkitRelativePath || null, type: r.type, blob: r, savedAt: Date.now() }); }'
);

html = html.replace(
  /for \(let f of N\) \{[\s\S]*?fileName: f\.name\s*\}\);\s*\}/,
  'for (let f of N) { let k = window.__getMediaFileKey ? window.__getMediaFileKey(f) : (f.webkitRelativePath || f.name); let objUrl = URL.createObjectURL(f); let entry = { url: objUrl, mimeType: f.type || (f.name.match(/\\.(mp3|m4a|wav|flac)$/i) ? "audio/mpeg" : "video/mp4"), fileName: k }; ve.set(k, entry); if (!ve.has(f.name)) ve.set(f.name, entry); }'
);

// 4. Patch Add Sheet (yb) file input to deduplicate by (folder + fileName) and suggest title
html = html.replace(
  /u\("input",\s*\{\s*"aria-label":\s*"Choose local media files"[\s\S]*?onChange:\s*m\s*=>\s*g\(Array\.from\(m\.target\.files\s*\?\?\s*\[\]\)\)\s*\}\)/,
  'u("input", { "aria-label": "Choose local media files", type: "file", multiple: !0, accept: "video/*,audio/*,.mkv,.mp3,.flac,.m4a,.wav", onChange: m => { var incoming = Array.from(m.target.files ?? []).filter(f => /\\.(mp4|mkv|webm|mov|m4v|avi|mp3|flac|m4a|wav|ogg)$/i.test(f.name) || (f.type && (f.type.startsWith("video/") || f.type.startsWith("audio/")))); if (incoming.length === 0) return; g(prev => window.__mergeUniquePickerFiles ? window.__mergeUniquePickerFiles(prev, incoming) : incoming); var suggested = window.__suggestTitleFromFiles ? window.__suggestTitleFromFiles(incoming) : ""; if (suggested) { window.__lastSuggestedTitle = suggested; r(curr => curr.trim() ? curr : suggested); } m.target.value = ""; } })'
);

// 5. Add editable title suggestion bar right below the title input
html = html.replace(
  /u\("input",\s*\{\s*"aria-label":\s*"Collection title"[\s\S]*?required:\s*!0\s*\}\)/,
  'u("input", { "aria-label": "Collection title", value: n, onChange: m => r(m.target.value), placeholder: i === "series" ? "e.g. KonoSuba" : i === "movie" ? "e.g. Dune: Part Two" : "e.g. Night drive", required: !0 }), c.length > 0 && window.__suggestTitleFromFiles && (() => { var sug = window.__suggestTitleFromFiles(c); return sug ? v("div", { className: "title-suggestion-bar", children: [v("span", { children: ["Suggested: ", u("strong", { children: sug })] }), n.trim() !== sug ? u("button", { type: "button", className: "suggestion-apply-btn", onClick: () => r(sug), children: "Use title" }) : u("small", { className: "suggestion-active-note", children: "✓ Editable above" })] }) : null; })()'
);

// 6. Add One-Tap Folder Picker button and updated file summary
html = html.replace(
  /c\.length > 0 && v\("p",\s*\{\s*className:\s*"file-summary"[\s\S]*?matched automatically\."\]\s*\}\)/,
  'v("div", { className: "folder-picker-row", children: [v("label", { className: "secondary-action folder-pick-btn", children: [u(k, { name: "folder", size: 17 }), " Pick entire folder in one tap", u("input", { type: "file", webkitdirectory: "", directory: "", multiple: !0, className: "sr-only", onChange: m => { var incoming = Array.from(m.target.files ?? []).filter(f => /\\.(mp4|mkv|webm|mov|m4v|avi|mp3|flac|m4a|wav|ogg)$/i.test(f.name) || (f.type && (f.type.startsWith("video/") || f.type.startsWith("audio/")))); if (incoming.length === 0) return; g(prev => window.__mergeUniquePickerFiles ? window.__mergeUniquePickerFiles(prev, incoming) : incoming); var suggested = window.__suggestTitleFromFiles ? window.__suggestTitleFromFiles(incoming) : ""; if (suggested) { window.__lastSuggestedTitle = suggested; r(curr => curr.trim() ? curr : suggested); } m.target.value = ""; } })] }), c.length > 0 && u("button", { type: "button", className: "secondary-action clear-files-btn", onClick: () => g([]), children: "Clear" })] }), c.length > 0 && v("p", { className: "file-summary", children: [u("strong", { children: c.length }), " unique local ", c.length === 1 ? "file" : "files", " ready (checked by folder + filename). Same title merges into one entry."] })'
);

