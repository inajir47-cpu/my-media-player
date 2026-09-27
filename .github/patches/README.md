# Patch Parts

The build-apk.yml patch.js is split into these parts for easier management.
Edit the specific part file instead of searching through 6000+ lines.

## How it works

The workflow concatenates these files in order to build patch.js:
```bash
cat .github/patches/*.js > patch.js
node patch.js
```

## Parts

| File | Description | Lines |
|------|-------------|-------|
| `00-header.js` | Setup: fs module and html variable | ~3 |
| `01-base-cleanup.js` | Sections 1-6: Remove Muse bridge, clear snapshot, folder picker, title bar | ~40 |
| `02-episode-ui.js` | Sections 7-11: Episode UI, continue watching, history tab | ~60 |
| `03-hero-carousel.js` | Section 12: Hero carousel 2+2+2 + trailer scripts + OVA + Ultimate + Heart + Watch Online | ~600 |
| `04-vlc-player.js` | Section 13: VLC player upgrades | ~25 |
| `05-custom-css.js` | Section 14: All custom CSS | ~5200 |
| `06-clips.js` | Sections 15-17: Random clips, detail container, continue watching refetch | ~40 |
| `07-theme-cache.js` | Section 18: Opening theme offline cache (IndexedDB) | ~200 |
| `08-hindi.js` | Section 19: Hindi/ToonStream integration | ~435 |
| `09-detail-fade.js` | Sections 20-21: Detail hero black fade | ~20 |
| `10-language-switch.js` | Language switcher (Hindi ↔ English) in video player | ~80 |
| `99-footer.js` | Write the patched HTML file | ~4 |

## Adding a new feature

1. Create a new file like `10-my-feature.js` (number determines order)
2. Write your patch code operating on the `html` variable
3. Push - the workflow picks it up automatically

## Rules

- Each file operates on the shared `html` variable
- Don't redeclare `fs` or `html` (already in 00-header.js)
- Don't write the file (that's 99-footer.js)
- Keep the 10-space YAML indentation in mind if editing build-apk.yml directly
