// Section 12: Hero carousel 4+2+2 + trailer scripts
// 12. Hero Carousel 4+2+2 rule: 4 Recently Added + 2 Recently Watched (+ 2 Newly Launched injected separately)
html = html.replace(
  'Me = [...R].sort((N, q) => Date.parse(q.createdAt) - Date.parse(N.createdAt)).slice(0, 3),\n    lt = (A.data?.items ?? []).slice(0, 2),',
  'Me = [...R].sort((N, q) => Date.parse(q.createdAt) - Date.parse(N.createdAt)).slice(0, 4).concat((window.__newlyLaunched||[]).slice(0,2)),\n    lt = (function(){ var local=(A.data?.items ?? []).slice(); try{ var oh=JSON.parse(localStorage.getItem("__online_history_v1")||"[]"); var seen={}; local.forEach(function(x){ if(x&&x.collectionId) seen[String(x.collectionId)]=1; }); oh.forEach(function(o){ var k="online:"+(o.animeId||""); if(o&&o.animeId&&!seen[k]){ seen[k]=1; local.push({ collectionId:k, collectionTitle:o.title, displayTitle:(o.title||"")+" E"+(o.ep||""), lastWatchedAt:o.lastWatchedAt||0, posterUrl:o.poster||null }); } }); }catch(e){} local.sort(function(a,b){ return (b.lastWatchedAt||0)-(a.lastWatchedAt||0); }); return local; })().slice(0, 2),'
);

html = html.replace(
  'onMouseEnter: () => y(!0),\n            onMouseLeave: () => y(!1),',
  'onMouseEnter: () => y(!0),\n            onMouseLeave: () => y(!1),\n            onTouchStart: X => { y(!0); if (window.__carouselTouchStart) window.__carouselTouchStart(X); },\n            onTouchMove: X => { if (window.__carouselTouchMove) window.__carouselTouchMove(X); },\n            onTouchEnd: X => { y(!1); if (window.__carouselTouchEnd) window.__carouselTouchEnd(X, me.length, b); },\n            onTouchCancel: X => { y(!1); if (window.__carouselTouchCancel) window.__carouselTouchCancel(X); },'
);

html = html.replace(
  'onClick: () => {\n        if (r && !t) i();else l();\n      },',
  'onClick: () => { l(); },'
);

// 12b. Inject 2 Newly Launched Online anime into Hero Carousel (4+2+2 rule)
html = html.replace(
  '</body>',
  `<script>
  (function(){
    function fetchNewlyLaunched(){
      var q = 'query { Page(page:1, perPage:10){ media(type:ANIME, status:RELEASING, sort:START_DATE_DESC){ id title{ romaji english } coverImage{ large } startDate{ year } } } }';
      return fetch('https://graphql.anilist.co', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q}) })
        .then(function(r){ return r.json(); })
        .then(function(d){
          var list = ((d.data||{}).Page||{}).media||[];
          return list.slice(0,2).map(function(m){
            return { title:(m.title.english||m.title.romaji||'Unknown'), anilistId:m.id, image:(m.coverImage||{}).large||null, year:(m.startDate||{}).year||null, _newlyLaunched:true };
          });
        }).catch(function(){ return []; });
    }
    function injectSlides(items){
      if(!items.length) return;
      // Don't append raw DOM divs (breaks React grid) - save via handleAction instead
      // so React renders them natively in the carousel
      items.forEach(function(item){
        try {
          if (window.handleAction) {
            window.handleAction('addCollection', {
              title: item.title,
              kind: 'series',
              year: item.year || new Date().getFullYear(),
              files: [],
              discoverCached: true,
              isWatchlist: false,
              posterUrl: item.image || '',
              anilistId: item.anilistId || null
            });
          }
        } catch(e) {}
      });
    }
    // Fetch immediately and retry - store in window for carousel to pick up
    window.__newlyLaunched = [];
    function doFetch(){
      fetchNewlyLaunched().then(function(items){
        window.__newlyLaunched = items;
        injectSlides(items);
      });
    }
    doFetch();
    // Retry after 3s in case handleAction wasn't ready
    setTimeout(doFetch, 3000);
  })();
  </script>
  <script>
  // AnimeThemes direct trailer fetch (raw .webm, no YouTube errors)
  window.__trailerCache = window.__trailerCache || {};
  async function fetchTrailerUrl(anilistId, title) {
    var cacheKey = String(anilistId || '') + ':' + String(title || '').toLowerCase().trim();
    if (!anilistId && !title) return null;
    if (window.__trailerCache[cacheKey]) return window.__trailerCache[cacheKey];
    try {
      var url = null;
      // Look up saved trailer or anilistId from local DB first
      if (title) {
        try {
          var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
          var norm = title.toLowerCase().trim();
          var matchCol = (db.collections || []).find(function(c){ return String(c.title || '').toLowerCase().trim() === norm; });
          if (matchCol) {
            if (matchCol.trailerVideoUrl) { window.__trailerCache[cacheKey] = matchCol.trailerVideoUrl; return matchCol.trailerVideoUrl; }
            if (!anilistId && matchCol.anilistId) anilistId = matchCol.anilistId;
          }
        } catch(e) {}
      }
      // If anilistId is still missing, resolve it via AniList GraphQL
      if (!anilistId && title) {
        try {
          var gRes = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query ($s: String) { Media(search: $s, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) { id } }', variables: { s: title } }) });
          var gData = await gRes.json();
          if (gData && gData.data && gData.data.Media && gData.data.Media.id) { anilistId = gData.data.Media.id; }
        } catch(e) {}
      }
      // Primary: by AniList ID
      if (anilistId) {
        var apiUrl = 'https://api.animethemes.moe/anime?filter[has]=resources&filter[site]=AniList&filter[external_id]=' + anilistId + '&include=animethemes.animethemeentries.videos';
        var res = await fetch(apiUrl);
        var data = await res.json();
        var anime = (data.anime && data.anime[0]) || null;
        if (anime && anime.animethemes) {
          for (var i = 0; i < anime.animethemes.length && !url; i++) {
            var entries = anime.animethemes[i].animethemeentries || [];
            for (var j = 0; j < entries.length && !url; j++) {
              var videos = entries[j].videos || [];
              for (var k = 0; k < videos.length && !url; k++) {
                if (videos[k].link && videos[k].link.indexOf('.webm') > 0) url = videos[k].link;
              }
            }
          }
        }
      }
      // Fallback: by title search
      if (!url && title) {
        var searchUrl = 'https://api.animethemes.moe/search?q=' + encodeURIComponent(title) + '&fields[search]=anime&include[anime]=animethemes.animethemeentries.videos';
        var sres = await fetch(searchUrl);
        var sdata = await sres.json();
        var sanime = (sdata.search && sdata.search.anime && sdata.search.anime[0]) || null;
        if (sanime && sanime.animethemes) {
          for (var a = 0; a < sanime.animethemes.length && !url; a++) {
            var aentries = sanime.animethemes[a].animethemeentries || [];
            for (var b = 0; b < aentries.length && !url; b++) {
              var avideos = aentries[b].videos || [];
              for (var c = 0; c < avideos.length && !url; c++) {
                if (avideos[c].link && avideos[c].link.indexOf('.webm') > 0) url = avideos[c].link;
              }
            }
          }
        }
      }
      if (url) window.__trailerCache[cacheKey] = url;
      return url;
    } catch(e) { return null; }
  }
  window.fetchTrailerUrl = fetchTrailerUrl;
  // Save trailer URL to collection in DB
  function saveTrailerToCollection(collectionId, trailerUrl) {
    try {
      var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
      var col = (db.collections || []).find(function(c){ return String(c.id) === String(collectionId); });
      if (col && trailerUrl) {
        col.trailerVideoUrl = trailerUrl;
        localStorage.setItem('media_player_exact_db_v5', JSON.stringify(db));
      }
    } catch(e) {}
  }
  </script>
  <script>
  // Online video fallback for Hero Carousel & Detail background preview (when no local file)
  (function(){
    // Store video positions by URL so carousel doesn't restart from beginning
    var __trailerPositions = {};
    function clearTrailerLayer(preview) {
      if (!preview) return;
      var layer = preview.querySelector('.trailer-preview-layer');
      if (layer) {
        var vid = layer.querySelector('video');
        if (vid) {
          try {
            // Save current position before removing (use data attribute for consistent key)
            var urlKey = vid.getAttribute('data-trailer-url') || vid.src;
            if (urlKey && vid.currentTime > 0) {
              __trailerPositions[urlKey] = vid.currentTime;
            }
            vid.pause(); vid.removeAttribute('src'); vid.load();
          } catch(e){}
        }
        layer.remove();
      }
    }

    function playTrailerPreview(preview, url){
      if (!preview || !url) { if (preview) preview.dataset.onlineActive = ''; return; }
      clearTrailerLayer(preview);
      var layer = document.createElement('div');
      layer.className = 'trailer-preview-layer';
      layer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:2;background:#000;overflow:hidden;';
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.8s ease;pointer-events:none;';
      v.src = url;
      v.setAttribute('data-trailer-url', url); // Store original URL for position restore
      layer.appendChild(v);
      var muteBtn = document.createElement('button');
      muteBtn.type = 'button';
      muteBtn.innerHTML = '&#128263;';
      muteBtn.style.cssText = 'position:absolute;top:14px;right:14px;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:16px;width:36px;height:36px;border-radius:50%;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;';
      muteBtn.onclick = function(e){ e.stopPropagation(); v.muted = !v.muted; muteBtn.innerHTML = v.muted ? '&#128263;' : '&#128266;'; };
      layer.appendChild(muteBtn);
      // Keep the app's own absolute fill (inset:0); only make the
      // preview a positioned box when it is static, so the absolute
      // trailer layer (inset:0) actually fills the hero instead of
      // collapsing to zero height.
      try {
        if (window.getComputedStyle(preview).position === 'static') {
          preview.style.position = 'relative';
        }
      } catch (e) {}
      preview.appendChild(layer);
      v.onloadedmetadata = function() {
        // Restore saved position, or start at 5s for long videos
        var savedPos = __trailerPositions[url];
        if (savedPos && savedPos > 0 && savedPos < v.duration - 5) {
          try { v.currentTime = savedPos; } catch(e) {}
        } else if (v.duration > 35) {
          try { v.currentTime = 5; } catch(e) {}
        }
        v.play().catch(function(){});
      };
      v.onplaying = function(){ v.style.opacity = '1'; };
      v.onerror = function(){ clearTrailerLayer(preview); preview.dataset.onlineActive = 'none'; };
      v.play().catch(function(){});
    }
    window.playTrailerPreview = playTrailerPreview;

    function syncContainerTrailer(containerSelector) {
      var container = document.querySelector(containerSelector);
      if (!container) return;
      var preview = container.querySelector('.local-clip-preview');
      if (!preview) return;
      var titleEl = container.querySelector('.featured-copy h1, .detail-hero h1, h1');
      var title = titleEl ? titleEl.textContent.trim() : '';
      if (!title) return;
      var nativeLocalVideo = Array.from(preview.querySelectorAll('video')).find(function(vid) {
        return !vid.closest('.trailer-preview-layer');
      });
      if (nativeLocalVideo && !preview.classList.contains('empty')) {
        clearTrailerLayer(preview);
        preview.dataset.lastTitle = title;
        preview.dataset.onlineActive = '';
        return;
      }
      if (preview.dataset.lastTitle !== title) {
        clearTrailerLayer(preview);
        preview.dataset.lastTitle = title;
        preview.dataset.onlineActive = '';
      }
      if (preview.dataset.onlineActive === '1' || preview.dataset.onlineActive === 'loading' || preview.dataset.onlineActive === 'none') return;
      preview.dataset.onlineActive = 'loading';
      var anilistId = (titleEl && titleEl.dataset.anilistId) || null;
      fetchTrailerUrl(anilistId, title).then(function(trailerUrl) {
        var nowTitleEl = container.querySelector('.featured-copy h1, .detail-hero h1, h1');
        var nowTitle = nowTitleEl ? nowTitleEl.textContent.trim() : '';
        if (nowTitle !== title) return;
        if (trailerUrl) {
          preview.dataset.onlineActive = '1';
          playTrailerPreview(preview, trailerUrl);
        } else {
          preview.dataset.onlineActive = 'none';
        }
      }).catch(function() { preview.dataset.onlineActive = 'none'; });
    }

    setInterval(function() {
      syncContainerTrailer('.home-carousel');
      syncContainerTrailer('.detail-hero');
    }, 1000);
  })();
  </script>
  <script>
  // OVA Episode Count & Episode Grid Enhancement for Watch Order
  (function(){
    function getRelatedMedia() {
      try {
        var colId = window.__getColIdFromDetail ? window.__getColIdFromDetail() : null;
        if (!colId) return [];
        var dbRaw = localStorage.getItem('media_player_exact_db_v5');
        var db = dbRaw ? JSON.parse(dbRaw) : null;
        if (!db) return [];
        var col = (db.collections || []).find(function(c){ return String(c.id) === String(colId); });
        return col ? col.relatedMedia || [] : [];
      } catch(e) { return []; }
    }
    function enhanceWatchOrder() {
      var related = getRelatedMedia();
      if (!related.length) return;
      // Find watch order cards
      document.querySelectorAll('.watch-order-card').forEach(function(card){
        if (card.dataset.ovaEnhanced) return;
        var titleEl = card.querySelector('[class*="title"]');
        if (!titleEl) return;
        var title = titleEl.textContent.trim();
        var rm = related.find(function(r){
          return r.title && title.toLowerCase().indexOf(r.title.toLowerCase().slice(0, 20)) >= 0;
        });
        if (rm && (rm.contentType === 'ova' || rm.contentType === 'special') && rm.episodeCount > 1) {
          card.dataset.ovaEnhanced = '1';
          // Add episode count badge
          var badge = document.createElement('span');
          badge.className = 'ova-ep-count';
          badge.style.cssText = 'background:#7c3aed;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:8px;';
          badge.textContent = rm.episodeCount + ' episodes';
          titleEl.appendChild(badge);
        }
      });
      // Enhance related-detail header with episode count
      document.querySelectorAll('[class*="related-detail"], [class*="relatedDetail"]').forEach(function(detail){
        if (detail.dataset.ovaEnhanced) return;
        var typeEl = detail.querySelector('p[class*="related-type"], .related-type');
        if (!typeEl) return;
        var titleEl = detail.querySelector('h2, h3, [class*="title"]');
        var title = titleEl ? titleEl.textContent.trim() : '';
        var rm = related.find(function(r){
          return r.title && title.toLowerCase().indexOf(r.title.toLowerCase().slice(0, 20)) >= 0;
        });
        if (rm && (rm.contentType === 'ova' || rm.contentType === 'special') && rm.episodeCount) {
          detail.dataset.ovaEnhanced = '1';
          // Update header to include episode count
          if (typeEl.textContent.indexOf('EPISODE') < 0) {
            typeEl.textContent = typeEl.textContent.replace(/·\s*$/, '') + ' · ' + rm.episodeCount + ' EPISODES';
          }
          // Render episode grid below info box
          if (rm.episodes && rm.episodes.length > 1 && !detail.querySelector('.ova-ep-grid')) {
            var grid = document.createElement('div');
            grid.className = 'ova-ep-grid';
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:16px;padding:0 16px;';
            grid.innerHTML = '<div style="grid-column:1/-1;font-weight:600;margin-bottom:4px;">Episodes · ' + rm.episodes.length + ' listed</div>' +
              rm.episodes.map(function(e){
                return '<button type="button" class="ova-ep-card" data-ep="' + e.number + '" data-title="' + rm.title.replace(/"/g, '&quot;') + '" ' +
                  'style="background:#1a1d24;border:1px solid #2a2e38;border-radius:8px;padding:12px;cursor:pointer;color:#fff;text-align:left;">' +
                  '<div style="font-weight:600;">EP ' + String(e.number).padStart(2, '0') + '</div>' +
                  '<div style="font-size:12px;opacity:0.7;margin-top:4px;">' + e.title + '</div>' +
                  '<div style="font-size:11px;color:#7c3aed;margin-top:8px;">🌐 Watch online</div>' +
                  '</button>';
              }).join('');
            detail.appendChild(grid);
            // Wire episode buttons
            grid.querySelectorAll('.ova-ep-card').forEach(function(btn){
              btn.onclick = function(){
                var epNum = parseInt(btn.getAttribute('data-ep'), 10);
                var t = btn.getAttribute('data-title');
                if (window.autoPlayOnline) window.autoPlayOnline(t, epNum, 'ova', {direct:true});
              };
            });
          }
        }
      });
    }
    // Run periodically to catch dynamically rendered content
    setInterval(enhanceWatchOrder, 2000);
    // Also run on hash change (navigation)
    window.addEventListener('hashchange', function(){ setTimeout(enhanceWatchOrder, 500); });
  })();
  </script>
  <script>
  // Ultimate Search tab - opens the anime search popup directly
  (function(){
    function injectUltimateTab() {
      var nav = document.querySelector('.topbar nav');
      if (!nav || nav.querySelector('[data-tab="ultimate-search"]')) return;
      var buttons = nav.querySelectorAll('button');
      if (!buttons.length) return;
      var ultBtn = document.createElement('button');
      ultBtn.textContent = 'Ultimate';
      ultBtn.setAttribute('data-tab', 'ultimate-search');
      // Copy class but NOT inline styles (avoids hardcoded white active bg)
      ultBtn.className = buttons[0].className.replace(/\\bactive\\b/g, '').trim();
      ultBtn.onclick = function(){
        try {
          if (window.openAnimeWatch) { window.openAnimeWatch(""); return; }
          if (typeof openAnimeWatch === 'function') { openAnimeWatch(""); return; }
          if (window.__openAnimeWatch) { window.__openAnimeWatch(""); return; }
        } catch(e) {}
        // Fallback feedback so tap never appears dead
        try {
          if (window.awToast) awToast('Search not ready yet, try again');
          else alert('Search not ready yet, try again');
        } catch(e2) {}
      };
      // Insert right after Home (first button)
      if (buttons[0].nextSibling) {
        nav.insertBefore(ultBtn, buttons[0].nextSibling);
      } else {
        nav.appendChild(ultBtn);
      }
      window.__ultBtn = ultBtn;
    }
    // Run injection periodically (for React re-renders)
    setInterval(injectUltimateTab, 2000);
    injectUltimateTab();
  })();
  </script>
  <script>
  // Heart (watchlist) button for native detail page
  (function(){
    function getColIdFromDetail() {
      // Find collection by detail page h1 title or tracked ID (React doesn't use location.hash)
      var h1 = document.querySelector('main.detail-view h1, .detail-hero h1');
      if (!h1) return null;
      var t = h1.textContent.trim().toLowerCase();
      try {
        var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
        var byTitle = (db.collections || []).find(function(c){ return String(c.title || '').trim().toLowerCase() === t; });
        if (byTitle) return String(byTitle.id);
        if (window.__currentDetailCollectionId) return String(window.__currentDetailCollectionId);
      } catch (e) {}
      return null;
    }
    window.__getColIdFromDetail = getColIdFromDetail;
    function injectHeart() {
      var heroActions = document.querySelector('.hero-actions');
      if (!heroActions || heroActions.querySelector('.wl-heart-btn')) return;
      var colId = getColIdFromDetail();
      if (!colId) return;
      try {
        var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
        var col = (db.collections || []).find(function(c){ return String(c.id) === String(colId); });
        if (!col) return;
        var btn = document.createElement('button');
        btn.className = 'wl-heart-btn';
        btn.style.cssText = 'background:rgba(255,255,255,.1);border:none;color:#fff;font-size:20px;width:44px;height:44px;border-radius:50%;cursor:pointer;margin-left:8px;';
        btn.textContent = col.isWatchlist ? '\u2764\uFE0F' : '\uD83E\uDD0D';
        btn.title = col.isWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
        btn.onclick = function(e){
          e.stopPropagation();
          try {
            var db2 = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
            var c2 = (db2.collections || []).find(function(x){ return String(x.id) === String(colId); });
            if (c2) {
              c2.isWatchlist = !c2.isWatchlist;
              if (c2.isWatchlist) c2.discoverCached = false;
              localStorage.setItem('media_player_exact_db_v5', JSON.stringify(db2));
              btn.textContent = c2.isWatchlist ? '\u2764\uFE0F' : '\uD83E\uDD0D';
              btn.title = c2.isWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
              if (window.awToast) awToast(c2.isWatchlist ? 'Added to watchlist \u2665' : 'Removed from watchlist');
            }
          } catch(err) {}
        };
        heroActions.appendChild(btn);
        // Add Trailer button if trailerVideoUrl available
        injectTrailerBtn(heroActions, col);
      } catch(e) {}
    }
    function injectTrailerBtn(heroActions, col) {
      if (heroActions.querySelector('.trailer-btn')) return;
      var trailerUrl = col.trailerVideoUrl;
      if (!trailerUrl) {
        // Try to fetch it
        var anilistId = col.anilistId || null;
        fetchTrailerUrl(anilistId, col.title).then(function(url){
          if (url) {
            saveTrailerToCollection(col.id, url);
            col.trailerVideoUrl = url;
            injectTrailerBtn(heroActions, col);
          }
        });
        return;
      }
      var tbtn = document.createElement('button');
      tbtn.className = 'trailer-btn';
      tbtn.innerHTML = '&#127916; Trailer';
      tbtn.style.cssText = 'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:14px;padding:10px 18px;border-radius:24px;cursor:pointer;margin-left:8px;';
      tbtn.onclick = function(e){
        e.stopPropagation();
        playTrailerFull(col.trailerVideoUrl, col.title);
      };
      heroActions.appendChild(tbtn);
    }
    // Play trailer in fullscreen overlay with sound
    function playTrailerFull(url, title) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;';
      overlay.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,.8);">' +
        '<span style="color:#fff;font-size:16px;">&#127916; ' + (title || 'Trailer') + '</span>' +
        '<button id="trailer-close" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button></div>' +
        '<video id="trailer-video" controls autoplay playsinline style="flex:1;width:100%;object-fit:contain;background:#000;" src="' + url + '"></video>';
      document.body.appendChild(overlay);
      document.getElementById('trailer-close').onclick = function(){
        var v = document.getElementById('trailer-video');
        if (v) v.pause();
        overlay.remove();
      };
    }
    // Also inject trailer preview in detail page hero background when no local file
    function injectDetailTrailerBg() {
      var preview = document.querySelector('.detail-view .local-clip-preview, main .local-clip-preview');
      if (!preview || preview.querySelector('video') || preview.dataset.trailerActive) return;
      var emptyMsg = preview.textContent || '';
      if (emptyMsg.indexOf('No local') < 0 && emptyMsg.indexOf('not connected') < 0 && preview.children.length > 0) return;
      var colId = getColIdFromDetail();
      if (!colId) return;
      try {
        var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
        var col = (db.collections || []).find(function(c){ return String(c.id) === String(colId); });
        if (!col || (col.files && col.files.length > 0)) return;
        if (col.trailerVideoUrl) {
          preview.dataset.trailerActive = '1';
          preview.innerHTML = '';
          playTrailerPreview(preview, col.trailerVideoUrl);
        } else {
          fetchTrailerUrl(col.anilistId, col.title).then(function(url){
            if (url) {
              saveTrailerToCollection(col.id, url);
              if (!preview.querySelector('video')) {
                preview.dataset.trailerActive = '1';
                preview.innerHTML = '';
                playTrailerPreview(preview, url);
              }
            }
          });
        }
      } catch(e) {}
    }
    setInterval(injectHeart, 2000);
    // (removed: syncContainerTrailer now handles detail page)
  })();
  </script>
  <script>
  // Watch Online button for Movies + Episode grid for OVA/Specials on native detail page
  (function(){
    function getColFromDetail() {
      var h1 = document.querySelector('main.detail-view h1, .detail-hero h1');
      if (!h1) return null;
      var t = h1.textContent.trim().toLowerCase();
      try {
        var db = JSON.parse(localStorage.getItem('media_player_exact_db_v5') || '{}');
        var col = (db.collections || []).find(function(c){ return String(c.title || '').trim().toLowerCase() === t; });
        return col || null;
      } catch(e) { return null; }
    }
    function injectWatchOnlineBtn() {
      var heroActions = document.querySelector('.hero-actions');
      if (!heroActions || heroActions.querySelector('.wo-online-btn, .wo-online-btn2')) return;
      // Skip if there's already a Play local file button (has local files)
      var hasLocalPlay = Array.from(heroActions.querySelectorAll('button')).some(function(b){
        return /play local|resume/i.test(b.textContent);
      });
      if (hasLocalPlay) return;
      var col = getColFromDetail();
      if (!col) return;
      // Add native-style buttons like episode cards: Connect local file + Watch online
      // "Connect local file" button (native secondary-action style)
      var connectBtn = document.createElement('button');
      connectBtn.className = 'wo-online-btn secondary-action';
      connectBtn.innerHTML = '&#128193; Connect local file';
      connectBtn.onclick = function(e){
        e.stopPropagation();
        // Trigger the native file picker
        var fileInput = document.querySelector('input[type="file"].sr-only');
        if (fileInput) fileInput.click();
      };
      heroActions.appendChild(connectBtn);
      // "Watch online" button (native secondary-action style, like related media)
      var watchBtn = document.createElement('button');
      watchBtn.className = 'wo-online-btn2 secondary-action';
      watchBtn.innerHTML = '&#127760; Watch online';
      watchBtn.onclick = function(e){
        e.stopPropagation();
        var cType = 'series';
        if (col.kind === 'movie') cType = 'movie';
        else if (col.contentType === 'ova') cType = 'ova';
        else if (col.contentType === 'special') cType = 'special';
        if (window.autoPlayOnline) {
          window.autoPlayOnline(col.title, 1, cType, {direct:true});
        } else if (window.__autoPlayOnline) {
          window.__autoPlayOnline(col.title, 1, cType, {direct:true});
        }
      };
      heroActions.appendChild(watchBtn);
    }
    function injectOvaEpGrid() {
      var col = getColFromDetail();
      if (!col) return;
      // Only for OVA/Special collections
      if (col.contentType !== 'ova' && col.contentType !== 'special' && col.kind !== 'ova') return;
      var detailView = document.querySelector('main.detail-view');
      if (!detailView || detailView.querySelector('.wo-ova-grid')) return;
      // Get episode count from relatedMedia or AniList
      var epCount = col.episodeCount || 0;
      var episodes = col.episodes || [];
      // Try to find from relatedMedia if not on col directly
      if (!epCount && col.relatedMedia) {
        var rm = col.relatedMedia.find(function(r){
          return r.title && col.title && r.title.toLowerCase() === col.title.toLowerCase();
        });
        if (rm) { epCount = rm.episodeCount || 0; episodes = rm.episodes || []; }
      }
      if (!epCount && !episodes.length) return;
      var grid = document.createElement('div');
      grid.className = 'wo-ova-grid';
      grid.style.cssText = 'margin:16px;padding:16px;background:#14161c;border-radius:12px;';
      var html = '<div style="font-weight:700;font-size:16px;margin-bottom:4px;color:#fff;">Episodes &middot; ' + (episodes.length || epCount) + ' listed</div>';
      html += '<div style="font-size:12px;color:#888;margin-bottom:12px;">Tap an episode to play local file or watch online</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">';
      var eps = episodes.length ? episodes : Array.from({length: epCount}, function(_, i){ return {number: i+1, title: 'Episode ' + (i+1)}; });
      eps.forEach(function(ep){
        var epNum = ep.number || ep.episode || 0;
        var epTitle = ep.title || ('Episode ' + epNum);
        // Check if local file exists for this episode
        var hasLocal = col.files && col.files.some(function(f){
          return f.episodeNumber === epNum || f.displayTitle.indexOf('E' + epNum) >= 0;
        });
        html += '<div class="wo-ova-card" data-ep="' + epNum + '" style="background:#1a1d24;border:1px solid #2a2e38;border-radius:8px;padding:12px;cursor:pointer;">' +
          '<div style="font-weight:600;color:#fff;">EP ' + String(epNum).padStart(2, '0') + '</div>' +
          '<div style="font-size:12px;color:#aaa;margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + epTitle.replace(/</g, '&lt;') + '</div>' +
          '<div style="font-size:11px;margin-top:8px;">' +
          (hasLocal ? '<span style="color:#4ade80;">&#9654; Play local</span> ' : '') +
          '<span style="color:#7c3aed;">&#127760; Watch online</span>' +
          '</div></div>';
      });
      html += '</div>';
      grid.innerHTML = html;
      // Insert after hero actions or at top of detail
      var heroActions = detailView.querySelector('.hero-actions');
      if (heroActions && heroActions.parentNode) {
        heroActions.parentNode.insertBefore(grid, heroActions.nextSibling);
      } else {
        detailView.appendChild(grid);
      }
      // Wire click handlers
      grid.querySelectorAll('.wo-ova-card').forEach(function(card){
        card.onclick = function(){
          var epNum = parseInt(card.getAttribute('data-ep'), 10);
          if (window.autoPlayOnline) window.autoPlayOnline(col.title, epNum, col.contentType || 'ova', {direct:true});
        };
      });
    }
    setInterval(function(){
      injectWatchOnlineBtn();
      injectOvaEpGrid();
    }, 2000);
    window.addEventListener('hashchange', function(){ setTimeout(function(){ injectWatchOnlineBtn(); injectOvaEpGrid(); }, 500); });
  })();
  </script>
  <script>
  // Fix: Online history carousel clicks -> play online directly (not "Collection not found")
  (function(){
    // Store online items for click matching (with displayTitle for exact matching)
    window.__onlineCarouselItems = [];
    function refreshOnlineItems(){
      try {
        var oh = JSON.parse(localStorage.getItem("__online_history_v1") || "[]");
        // Build displayTitle like the lt IIFE does: title + " E" + ep
        window.__onlineCarouselItems = oh.slice(0, 10).map(function(o){
          return {
            title: o.title,
            ep: o.ep || 1,
            animeId: o.animeId,
            displayTitle: (o.title || "") + " E" + (o.ep || ""),
            poster: o.poster
          };
        });
      } catch(e) { window.__onlineCarouselItems = []; }
    }
    refreshOnlineItems();
    setInterval(refreshOnlineItems, 5000);
    // Click interceptor for carousel slides (capture phase, before React)
    document.addEventListener('click', function(e){
      var slide = e.target.closest('[data-carousel-slide], .carousel-slide, .hero-slide, [class*="carousel"], [class*="hero"]');
      if (!slide) return;
      // Get all text from the slide for matching
      var slideText = slide.textContent || '';
      // Check if this matches an online history item by displayTitle
      var matched = null;
      for (var j = 0; j < window.__onlineCarouselItems.length; j++) {
        var item = window.__onlineCarouselItems[j];
        // Match by displayTitle (e.g., "Konosuba E5") or by title
        if (item.displayTitle && slideText.indexOf(item.displayTitle) >= 0) {
          matched = item;
          break;
        }
        // Fallback: match by title (first 30 chars)
        if (item.title && item.title.length > 5 && slideText.toLowerCase().indexOf(item.title.toLowerCase().substring(0, 30)) >= 0) {
          // Additional check: ensure it's not a real collection by verifying no collectionId match
          // (Real collections won't have "online:" in their data)
          matched = item;
          break;
        }
      }
      if (matched) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var ep = matched.ep || 1;
        if (window.autoPlayOnline) {
          window.autoPlayOnline(matched.title, ep, 'series', {direct:true});
        } else if (window.__autoPlayOnline) {
          window.__autoPlayOnline(matched.title, ep, 'series', {direct:true});
        }
      }
    }, true);
  })();
  </script></body>`
);

