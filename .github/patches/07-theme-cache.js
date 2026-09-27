// Section 18: Opening theme offline cache
// 18. Opening-theme offline cache (IndexedDB).
// When an anime is added to the Home screen, its opening theme video
// is downloaded in the background and stored in IndexedDB, so the
// carousel / info-page hero plays it instantly with no re-download.
// Deleting the anime removes its cached theme (unless another entry
// still references the same theme URL). 800MB cap, oldest evicted first.

// 18a. Inject the cache engine just before the trailer script block.
html = html.replace(
  '// Online video fallback for Hero Carousel & Detail background preview (when no local file)',
  `</script>
  <script>
  // 18. Opening-theme offline cache engine (IndexedDB).
  (function(){
    var TC_DB = 'konosuba-theme-cache';
    var TC_STORE = 'themes';
    var TC_MAX_BYTES = 800 * 1024 * 1024;
    var TC_PROXY = 'http://127.0.0.1:18923';
    function tcIsApp(){
      try { if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true; } catch(e){}
      return !!(window.androidBridge || window.AndroidPiP);
    }
    function tcKey(url){
      var h = 5381, s = String(url || ''), i;
      for (i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; }
      return 'theme-' + h.toString(36);
    }
    function tcDb(){
      if (!window.__tcDbPromise) {
        window.__tcDbPromise = new Promise(function(resolve, reject){
          try {
            var req = indexedDB.open(TC_DB, 1);
            req.onupgradeneeded = function(){ try { req.result.createObjectStore(TC_STORE, { keyPath: 'key' }); } catch(e){} };
            req.onsuccess = function(){ resolve(req.result); };
            req.onerror = function(){ reject(req.error || new Error('idb')); };
          } catch(e){ reject(e); }
        });
      }
      return window.__tcDbPromise;
    }
    function tcPut(url, blob){
      return tcDb().then(function(d){
        return new Promise(function(resolve){
          try {
            var t = d.transaction(TC_STORE, 'readwrite');
            t.objectStore(TC_STORE).put({ key: tcKey(url), url: url, blob: blob, size: blob.size || 0, savedAt: Date.now() });
            t.oncomplete = function(){ resolve(true); };
            t.onerror = function(){ resolve(false); };
            t.onabort = function(){ resolve(false); };
          } catch(e){ resolve(false); }
        });
      }).then(function(ok){ if (ok) { try { tcPrune(); } catch(e){} } return ok; })
      .catch(function(){ return false; });
    }
    function tcGet(url){
      return tcDb().then(function(d){
        return new Promise(function(resolve){
          try {
            var t = d.transaction(TC_STORE, 'readonly');
            var rq = t.objectStore(TC_STORE).get(tcKey(url));
            rq.onsuccess = function(){ resolve(rq.result || null); };
            rq.onerror = function(){ resolve(null); };
          } catch(e){ resolve(null); }
        });
      }).catch(function(){ return null; });
    }
    function tcDel(url){
      return tcDb().then(function(d){
        return new Promise(function(resolve){
          try {
            var t = d.transaction(TC_STORE, 'readwrite');
            t.objectStore(TC_STORE).delete(tcKey(url));
            t.oncomplete = function(){ resolve(true); };
            t.onerror = function(){ resolve(false); };
          } catch(e){ resolve(false); }
        });
      }).catch(function(){ return false; });
    }
    function tcPrune(){
      tcDb().then(function(d){
        try {
          var t = d.transaction(TC_STORE, 'readwrite');
          var st = t.objectStore(TC_STORE);
          var rq = st.getAll();
          rq.onsuccess = function(){
            try {
              var all = rq.result || [], total = 0, i;
              for (i = 0; i < all.length; i++) total += (all[i].size || 0);
              if (total <= TC_MAX_BYTES) return;
              all.sort(function(a, b){ return (a.savedAt || 0) - (b.savedAt || 0); });
              for (i = 0; i < all.length && total > TC_MAX_BYTES; i++) {
                total -= (all[i].size || 0);
                try { st.delete(all[i].key); } catch(e){}
              }
            } catch(e){}
          };
        } catch(e){}
      }).catch(function(){});
    }
    var tcInflight = {};
    function tcDownload(url){
      if (!url || tcInflight[url]) return;
      tcGet(url).then(function(rec){
        if (rec && rec.blob) return;
        tcInflight[url] = 1;
        var done = function(){ try { delete tcInflight[url]; } catch(e){} };
        var save = function(blob){
          if (blob && blob.size > 0) { tcPut(url, blob).then(done, done); }
          else { done(); }
        };
        var viaProxy = function(){
          if (!tcIsApp()) { done(); return; }
          fetch(TC_PROXY + '/r?u=' + encodeURIComponent(url)).then(function(r){
            if (!r.ok) throw new Error('proxy http ' + r.status);
            return r.blob();
          }).then(save, function(){ done(); });
        };
        fetch(url).then(function(r){
          if (!r.ok) throw new Error('http ' + r.status);
          return r.blob();
        }).then(save, viaProxy);
      }, function(){});
    }
    window.__cacheThemeVideo = tcDownload;
    window.__ThemeCache = { get: tcGet, put: tcPut, del: tcDel, key: tcKey, prune: tcPrune };
    window.__themeBlobUrl = function(url){
      return tcGet(url).then(function(rec){
        if (rec && rec.blob) {
          try { return URL.createObjectURL(rec.blob); } catch(e){}
        }
        return url;
      }, function(){ return url; });
    };
  })();
  </script>
  <script>
  // Online video fallback for Hero Carousel & Detail background preview (when no local file)`
);

// 18b. playTrailerPreview: prefer the cached copy, else stream now and
// save a copy in the background for next time.
html = html.replace(
  "v.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.8s ease;pointer-events:none;';\n      v.src = url;",
  `v.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.8s ease;pointer-events:none;';
      // 18. Offline theme cache: cached copy first, else stream; cache in background.
      try {
        if (window.__themeBlobUrl) { window.__themeBlobUrl(url).then(function(c){ try { v.src = (c || url); } catch(e){} }, function(){ try { v.src = url; } catch(e){} }); }
        else { v.src = url; }
      } catch(e) { try { v.src = url; } catch(e2){} }
      try { if (window.__cacheThemeVideo) window.__cacheThemeVideo(url); } catch(e) {}`
);

// 18c. clearTrailerLayer: revoke cached-theme object URLs so they don't leak.
html = html.replace(
  "if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch(e){} }",
  "if (vid) { try { var __vsrc = vid.getAttribute('src') || vid.src || ''; if (__vsrc.indexOf('blob:') === 0) { try { URL.revokeObjectURL(__vsrc); } catch(e){} } vid.pause(); vid.removeAttribute('src'); vid.load(); } catch(e){} }"
);

// 18d. saveTrailerToCollection: cache in the background whenever a trailer URL is saved.
html = html.replace(
  "col.trailerVideoUrl = trailerUrl;",
  "col.trailerVideoUrl = trailerUrl;\n                  try { if (window.__cacheThemeVideo) window.__cacheThemeVideo(trailerUrl); } catch(e) {}"
);

// 18e. addCollection: cache the theme when an anime is added (new or existing entry).
html = html.replace(
  "db.collections.unshift(newCol);",
  "try { if (newCol.trailerVideoUrl && window.__cacheThemeVideo) window.__cacheThemeVideo(newCol.trailerVideoUrl); } catch(e) {}\n                db.collections.unshift(newCol);"
);
html = html.replace(
  "attachFilesToCollection(existingCol, parsedFiles);",
  "try { if (existingCol.trailerVideoUrl && window.__cacheThemeVideo) window.__cacheThemeVideo(existingCol.trailerVideoUrl); } catch(e) {}\n                  attachFilesToCollection(existingCol, parsedFiles);"
);

// 18f. deleteCollection: drop the cached theme when its anime is deleted,
// unless another collection still references the same theme URL.
html = html.replace(
  `if (action === "deleteCollection") {
      db.collections = db.collections.filter(function(c) { return Number(c.id) !== Number(args.id); });
      saveDB(db);
      return { ok: true };
    }`,
  `if (action === "deleteCollection") {
      var __doomedCol = (db.collections || []).find(function(c) { return Number(c.id) === Number(args.id); });
      var __doomedTrailer = __doomedCol ? __doomedCol.trailerVideoUrl : null;
      db.collections = db.collections.filter(function(c) { return Number(c.id) !== Number(args.id); });
      saveDB(db);
      try {
        if (__doomedTrailer && window.__ThemeCache) {
          var __stillUsed = (db.collections || []).some(function(c) { return c.trailerVideoUrl === __doomedTrailer; });
          if (!__stillUsed) { window.__ThemeCache.del(__doomedTrailer); }
        }
      } catch(e) {}
      return { ok: true };
    }`
);

