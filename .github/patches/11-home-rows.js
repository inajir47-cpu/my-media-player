// 11-home-rows.js - Netflix-style discovery rows on Home
// Rows: Continue Watching, Trending Now, Top 10 All Time, Most Popular,
//       AI Picks For You, Top Upcoming, Recently Added, Watch History

html = html.replace(
  '</body>',
  `<script>
  (function(){
    var CACHE_KEY = '__homerows_cache_v1';
    var CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    // --- AniList GraphQL helper ---
    function anilistQuery(query, variables) {
      return fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, variables: variables || {} })
      }).then(function(r){ return r.json(); });
    }

    var MEDIA_FIELDS = 'id title { romaji english } coverImage { large medium } averageScore popularity genres startDate { year } status';

    function fetchRow(sort, status, perPage, page) {
      var q = 'query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus) { Page(page: $page, perPage: $perPage) { pageInfo { hasNextPage } media(type: ANIME, sort: $sort, status: $status) { ' + MEDIA_FIELDS + ' } } }';
      var vars = { page: page || 1, perPage: perPage || 20, sort: sort };
      if (status) vars.status = status;
      return anilistQuery(q, vars).then(function(d){
        var pg = ((d.data||{}).Page)||{};
        return { items: pg.media||[], hasNext: !!(pg.pageInfo||{}).hasNextPage };
      }).catch(function(){ return { items: [], hasNext: false }; });
    }

    // --- Cache ---
    function getCache() {
      try {
        var c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
        if (c && (Date.now() - c.ts) < CACHE_TTL) return c.data;
      } catch(e){}
      return null;
    }
    function setCache(data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch(e){}
    }

    // --- AI Picks: analyze user's genres from history ---
    function getUserTopGenres() {
      try {
        var genres = {};
        var oh = JSON.parse(localStorage.getItem('__online_history_v1')||'[]');
        oh.forEach(function(h){
          (h.genres||[]).forEach(function(g){ genres[g] = (genres[g]||0)+1; });
        });
        // Also check local collections if available
        var sorted = Object.keys(genres).sort(function(a,b){ return genres[b]-genres[a]; });
        return sorted.slice(0, 3);
      } catch(e){ return []; }
    }

    function fetchAIPicks() {
      var genres = getUserTopGenres();
      if (!genres.length) {
        // Fallback to popular if no history
        return fetchRow(['POPULARITY_DESC'], null, 20, 1);
      }
      var q = 'query ($genres: [String]) { Page(page: 1, perPage: 20) { media(type: ANIME, genre_in: $genres, sort: SCORE_DESC) { ' + MEDIA_FIELDS + ' } } }';
      return anilistQuery(q, { genres: genres }).then(function(d){
        return { items: ((((d.data||{}).Page)||{}).media||[]), hasNext: false };
      }).catch(function(){ return { items: [], hasNext: false }; });
    }

    // --- Row definitions ---
    var ROWS = [
      { id: 'trending', title: 'Trending Now', fetch: function(){ return fetchRow(['TRENDING_DESC'], null, 20, 1); } },
      { id: 'top10', title: 'Top 10 Anime of All Time', fetch: function(){ return fetchRow(['SCORE_DESC'], null, 10, 1); }, numbered: true },
      { id: 'popular', title: 'Most Popular', fetch: function(){ return fetchRow(['POPULARITY_DESC'], null, 20, 1); } },
      { id: 'aipicks', title: 'AI Picks For You', fetch: fetchAIPicks },
      { id: 'upcoming', title: 'Top Upcoming', fetch: function(){ return fetchRow(['POPULARITY_DESC'], 'NOT_YET_RELEASED', 20, 1); } }
    ];

    // --- Render helpers ---
    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function cardHTML(item, index, numbered) {
      var title = item.title.english || item.title.romaji || 'Unknown';
      var img = (item.coverImage||{}).large || (item.coverImage||{}).medium || '';
      var score = item.averageScore ? (item.averageScore/10).toFixed(1) : null;
      var numBadge = numbered ? '<div class="hr-num">'+(index+1)+'</div>' : '';
      return '<div class="hr-card" data-anilist="'+item.id+'" data-title="'+esc(title)+'">' +
        numBadge +
        '<img src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy">' +
        '<div class="hr-card-title">'+esc(title)+'</div>' +
        (score ? '<div class="hr-card-score">★ '+score+'</div>' : '') +
        '</div>';
    }

    function rowHTML(row, items) {
      var cards = items.map(function(it, i){ return cardHTML(it, i, row.numbered); }).join('');
      return '<div class="hr-row" data-row="'+row.id+'">' +
        '<div class="hr-row-header"><h2>'+esc(row.title)+'</h2>' +
        '<button class="hr-viewall" data-row="'+row.id+'">View All →</button></div>' +
        '<div class="hr-scroll">'+cards+'</div></div>';
    }

    // --- Inject rows into home ---
    function injectRows(data) {
      // Find home content area (below hero carousel)
      var home = document.querySelector('.home-content') || document.querySelector('[data-tab="home"]') || document.body;
      var container = document.getElementById('__homerows');
      if (!container) {
        container = document.createElement('div');
        container.id = '__homerows';
        // Insert after hero carousel if present
        var hero = document.querySelector('.home-carousel') || document.querySelector('.hero-carousel');
        if (hero && hero.parentNode) {
          hero.parentNode.insertBefore(container, hero.nextSibling);
        } else {
          home.appendChild(container);
        }
      }
      var html = '';
      ROWS.forEach(function(row){
        var items = (data[row.id]||{}).items || [];
        if (items.length) html += rowHTML(row, items);
      });
      container.innerHTML = html;
      bindCardClicks(container);
      bindViewAll(container);
    }

    // --- Card click: open online detail ---
    function bindCardClicks(container) {
      container.addEventListener('click', function(e){
        var card = e.target.closest('.hr-card');
        if (!card) return;
        var anilistId = card.getAttribute('data-anilist');
        var title = card.getAttribute('data-title');
        if (!anilistId) return;
        // Search our streaming API by title, then open detail
        if (typeof apiGet === 'function') {
          apiGet('/api/anime/search?q=' + encodeURIComponent(title)).then(function(d){
            var results = (d && d.results) || [];
            var match = results[0];
            if (match && typeof openSearchAnimeDetail === 'function') {
              openSearchAnimeDetail(match);
            } else if (typeof window.__openOnlineDetail === 'function') {
              window.__openOnlineDetail({ title: title, animeId: anilistId });
            }
          });
        }
      });
    }

    // --- View All: grid with infinite scroll ---
    function bindViewAll(container) {
      container.addEventListener('click', function(e){
        var btn = e.target.closest('.hr-viewall');
        if (!btn) return;
        var rowId = btn.getAttribute('data-row');
        var row = ROWS.find(function(r){ return r.id === rowId; });
        if (row) openViewAll(row);
      });
    }

    function openViewAll(row) {
      var overlay = document.createElement('div');
      overlay.className = 'hr-viewall-overlay';
      overlay.innerHTML = '<div class="hr-viewall-header"><button class="hr-back">← Back</button><h2>'+esc(row.title)+'</h2></div>' +
        '<div class="hr-grid" id="__hrgrid"></div><div class="hr-loading">Loading...</div>';
      document.body.appendChild(overlay);

      var page = 1, loading = false, hasMore = true;
      var grid = overlay.querySelector('#__hrgrid');
      var loadingEl = overlay.querySelector('.hr-loading');

      function loadMore() {
        if (loading || !hasMore) return;
        loading = true;
        loadingEl.style.display = 'block';
        // For paginated rows, fetch next page
        var fetchFn = row.id === 'aipicks' ? fetchAIPicks : function(){ return fetchRow(
          row.id==='trending' ? ['TRENDING_DESC'] :
          row.id==='top10' ? ['SCORE_DESC'] :
          row.id==='popular' ? ['POPULARITY_DESC'] :
          row.id==='upcoming' ? ['POPULARITY_DESC'] : ['TRENDING_DESC'],
          row.id==='upcoming' ? 'NOT_YET_RELEASED' : null,
          20, page
        ); };
        fetchFn().then(function(res){
          res.items.forEach(function(it, i){
            var div = document.createElement('div');
            div.innerHTML = cardHTML(it, (page-1)*20 + i, row.numbered);
            grid.appendChild(div.firstChild);
          });
          hasMore = res.hasNext;
          page++;
          loading = false;
          loadingEl.style.display = hasMore ? 'block' : 'none';
          if (!hasMore) loadingEl.textContent = 'No more';
          bindCardClicks(grid);
        });
      }

      // Infinite scroll
      overlay.addEventListener('scroll', function(){
        if (overlay.scrollTop + overlay.clientHeight >= overlay.scrollHeight - 200) {
          loadMore();
        }
      });

      overlay.querySelector('.hr-back').onclick = function(){ overlay.remove(); };
      loadMore();
    }

    // --- Main: load on home tab ---
    function loadHomeRows() {
      var cached = getCache();
      if (cached) {
        injectRows(cached);
        return;
      }
      var promises = {};
      ROWS.forEach(function(row){
        promises[row.id] = row.fetch();
      });
      // Wait for all
      var keys = Object.keys(promises);
      Promise.all(keys.map(function(k){ return promises[k]; })).then(function(results){
        var data = {};
        keys.forEach(function(k, i){ data[k] = results[i]; });
        setCache(data);
        injectRows(data);
      });
    }

    // --- Styles ---
    var css = document.createElement('style');
    css.textContent = '#__homerows{padding:0 0 20px}' +
      '.hr-row{margin:18px 0}' +
      '.hr-row-header{display:flex;justify-content:space-between;align-items:center;padding:0 16px;margin-bottom:10px}' +
      '.hr-row-header h2{font-size:18px;font-weight:700;color:#fff;margin:0}' +
      '.hr-viewall{background:none;border:none;color:#ff6b35;font-size:14px;cursor:pointer}' +
      '.hr-scroll{display:flex;gap:12px;overflow-x:auto;padding:0 16px;scrollbar-width:none}' +
      '.hr-scroll::-webkit-scrollbar{display:none}' +
      '.hr-card{flex:0 0 130px;cursor:pointer;position:relative}' +
      '.hr-card img{width:130px;height:190px;object-fit:cover;border-radius:8px}' +
      '.hr-card-title{font-size:12px;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.hr-card-score{font-size:11px;color:#ffb800}' +
      '.hr-num{position:absolute;left:-8px;bottom:40px;font-size:64px;font-weight:900;color:#000;-webkit-text-stroke:2px #fff;z-index:1;line-height:1}' +
      '.hr-viewall-overlay{position:fixed;inset:0;background:#0a0a0a;z-index:100003;overflow-y:auto}' +
      '.hr-viewall-header{position:sticky;top:0;background:#0a0a0a;padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #222;z-index:1}' +
      '.hr-viewall-header h2{font-size:18px;color:#fff;margin:0}' +
      '.hr-back{background:none;border:none;color:#ff6b35;font-size:16px;cursor:pointer}' +
      '.hr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}' +
      '.hr-grid .hr-card{flex:none}' +
      '.hr-grid .hr-card img{width:100%;height:auto;aspect-ratio:2/3}' +
      '.hr-loading{text-align:center;padding:20px;color:#888}';
    document.head.appendChild(css);

    // Load when home is visible (check every 2s for first 10s, then on tab clicks)
    var loaded = false;
    function tryLoad() {
      if (loaded) return;
      // Check if home tab is active (hero carousel visible)
      var hero = document.querySelector('.home-carousel') || document.querySelector('.hero-carousel');
      if (hero && hero.offsetParent !== null) {
        loaded = true;
        loadHomeRows();
      }
    }
    for (var i = 0; i < 5; i++) setTimeout(tryLoad, i * 2000);
    // Also try on tab clicks
    document.addEventListener('click', function(e){
      var tab = e.target.closest('[data-tab]');
      if (tab && (tab.getAttribute('data-tab') === 'home' || tab.textContent.trim().toLowerCase() === 'home')) {
        setTimeout(tryLoad, 500);
      }
    }, true);
  })();
  </script>
`);
