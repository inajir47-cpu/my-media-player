// 11-redesign.js - Netflix-style home redesign
// Complete rewrite with reliable mobile touch handling

html = html.replace(
  '</body>',
  `<script>
  (function(){
    'use strict';
    var CACHE_KEY = '__netflix_home_v1';
    var CACHE_TTL = 24 * 60 * 60 * 1000;

    // --- AniList API ---
    function anilistQuery(query, variables) {
      return fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, variables: variables || {} })
      }).then(function(r){ return r.json(); });
    }
    var FIELDS = 'id title { romaji english } coverImage { large medium } averageScore popularity genres startDate { year }';
    function fetchRow(sort, status, perPage, page) {
      var q = 'query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus) { Page(page: $page, perPage: $perPage) { pageInfo { hasNextPage } media(type: ANIME, sort: $sort, status: $status) { ' + FIELDS + ' } } }';
      var v = { page: page || 1, perPage: perPage || 20, sort: sort };
      if (status) v.status = status;
      return anilistQuery(q, v).then(function(d){
        var pg = ((d.data||{}).Page)||{};
        return { items: pg.media||[], hasNext: !!((pg.pageInfo||{}).hasNextPage) };
      }).catch(function(){ return { items: [], hasNext: false }; });
    }

    // --- Cache ---
    function getCache() {
      try {
        var c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
        if (c && (Date.now()-c.ts) < CACHE_TTL) return c.data;
      } catch(e){}
      return null;
    }
    function setCache(d) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ts: Date.now(), data: d})); } catch(e){}
    }

    // --- AI Picks ---
    function getTopGenres() {
      try {
        var g = {};
        var h = JSON.parse(localStorage.getItem('__online_history_v1')||'[]');
        h.forEach(function(x){ (x.genres||[]).forEach(function(gn){ g[gn]=(g[gn]||0)+1; }); });
        return Object.keys(g).sort(function(a,b){return g[b]-g[a];}).slice(0,3);
      } catch(e){ return []; }
    }
    function fetchAIPicks() {
      var genres = getTopGenres();
      if (!genres.length) return fetchRow(['POPULARITY_DESC'], null, 20, 1);
      var q = 'query ($genres: [String]) { Page(page: 1, perPage: 20) { media(type: ANIME, genre_in: $genres, sort: SCORE_DESC) { ' + FIELDS + ' } } }';
      return anilistQuery(q, {genres: genres}).then(function(d){
        return { items: ((((d.data||{}).Page)||{}).media||[]), hasNext: false };
      }).catch(function(){ return { items: [], hasNext: false }; });
    }

    var ROWS = [
      { id: 'trending', title: 'Trending Now', load: function(){ return fetchRow(['TRENDING_DESC'], null, 20, 1); } },
      { id: 'top10', title: 'Top 10 Anime of All Time', numbered: true, load: function(){ return fetchRow(['SCORE_DESC'], null, 10, 1); } },
      { id: 'popular', title: 'Most Popular', load: function(){ return fetchRow(['POPULARITY_DESC'], null, 20, 1); } },
      { id: 'aipicks', title: 'AI Picks For You', load: fetchAIPicks },
      { id: 'upcoming', title: 'Top Upcoming', load: function(){ return fetchRow(['POPULARITY_DESC'], 'NOT_YET_RELEASED', 20, 1); } }
    ];

    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function cardHTML(it, i, numbered) {
      var t = it.title.english || it.title.romaji || 'Unknown';
      var img = (it.coverImage||{}).large || (it.coverImage||{}).medium || '';
      var sc = it.averageScore ? (it.averageScore/10).toFixed(1) : '';
      return '<button type="button" class="nr-card" data-title="'+esc(t)+'">' +
        (numbered ? '<span class="nr-num">'+(i+1)+'</span>' : '') +
        '<span class="nr-imgwrap"><img src="'+esc(img)+'" alt="" loading="lazy"></span>' +
        '<span class="nr-title">'+esc(t)+'</span>' +
        (sc ? '<span class="nr-score">★ '+sc+'</span>' : '') +
        '</button>';
    }

    function render(data) {
      var c = document.getElementById('__nethome');
      if (!c) {
        c = document.createElement('div');
        c.id = '__nethome';
        // Insert after Continue Watching, else after hero, else at top of home
        var cw = document.querySelector('.continue-watching');
        var hero = document.querySelector('.home-carousel');
        var anchor = cw || hero;
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(c, anchor.nextSibling);
        else (document.querySelector('[data-tab="home"]')||document.body).appendChild(c);
      }
      var h = '';
      ROWS.forEach(function(row){
        var items = (data[row.id]||{}).items||[];
        if (!items.length) return;
        h += '<section class="nr-row" data-row="'+row.id+'">' +
          '<div class="nr-head"><h2>'+esc(row.title)+'</h2>' +
          '<button type="button" class="nr-more" data-viewall="'+row.id+'">View All &#8250;</button></div>' +
          '<div class="nr-strip">' + items.map(function(it,i){ return cardHTML(it,i,row.numbered); }).join('') + '</div>' +
          '</section>';
      });
      c.innerHTML = h;
    }

    function load() {
      var cached = getCache();
      if (cached) { render(cached); return; }
      var out = {}, pending = ROWS.length;
      ROWS.forEach(function(row){
        row.load().then(function(res){
          out[row.id] = res;
          if (--pending === 0) { setCache(out); render(out); }
        });
      });
    }

    // --- RELIABLE card tap handling ---
    // Use document-level delegation for both click and touchend.
    // This works even for dynamically added cards.
    function openAnime(title) {
      var apiGet = window.apiGet;
      var openDetail = window.openSearchAnimeDetail;
      if (typeof apiGet !== 'function' || typeof openDetail !== 'function') return;
      apiGet('/api/anime/search?q='+encodeURIComponent(title)).then(function(d){
        var r = (d&&d.results)||[];
        if (r.length) openDetail(r[0]);
      }).catch(function(){});
    }
    function handleTap(e) {
      var card = e.target.closest ? e.target.closest('.nr-card') : null;
      if (card) {
        e.preventDefault();
        openAnime(card.getAttribute('data-title'));
        return;
      }
      var va = e.target.closest ? e.target.closest('[data-viewall]') : null;
      if (va) {
        e.preventDefault();
        openViewAll(va.getAttribute('data-viewall'));
      }
    }
    document.addEventListener('click', handleTap, false);
    // touchend for faster mobile response (with guard against double-fire)
    var lastTouch = 0;
    document.addEventListener('touchend', function(e){
      var now = Date.now();
      if (now - lastTouch < 500) return;
      lastTouch = now;
      handleTap(e);
    }, {passive: false});

    // --- View All overlay ---
    function openViewAll(rowId) {
      var row = ROWS.filter(function(r){ return r.id===rowId; })[0];
      if (!row) return;
      var ov = document.createElement('div');
      ov.className = 'nr-overlay';
      ov.innerHTML = '<div class="nr-ovhead"><button type="button" class="nr-back">&#8249; Back</button><h2>'+esc(row.title)+'</h2></div>' +
        '<div class="nr-grid"></div><div class="nr-ovload">Loading...</div>';
      document.body.appendChild(ov);
      var grid = ov.querySelector('.nr-grid');
      var loadEl = ov.querySelector('.nr-ovload');
      var page = 1, busy = false, more = true;
      function moreItems() {
        if (busy || !more) return;
        busy = true;
        var p = (row.id==='aipicks') ? Promise.resolve({items:[],hasNext:false}) :
          fetchRow(
            row.id==='trending' ? ['TRENDING_DESC'] :
            row.id==='top10' ? ['SCORE_DESC'] :
            row.id==='upcoming' ? ['POPULARITY_DESC'] : ['POPULARITY_DESC'],
            row.id==='upcoming' ? 'NOT_YET_RELEASED' : null, 20, page);
        p.then(function(res){
          res.items.forEach(function(it,i){
            var w = document.createElement('div');
            w.innerHTML = cardHTML(it, (page-1)*20+i, row.numbered);
            grid.appendChild(w.firstChild);
          });
          more = res.hasNext; page++; busy = false;
          loadEl.style.display = more ? 'block' : 'none';
          if (!more) loadEl.textContent = 'End';
        });
      }
      ov.addEventListener('scroll', function(){
        if (ov.scrollTop + ov.clientHeight > ov.scrollHeight - 300) moreItems();
      });
      ov.querySelector('.nr-back').onclick = function(){ ov.remove(); };
      moreItems();
    }

    // --- Styles ---
    var st = document.createElement('style');
    st.textContent =
      '#__nethome{padding-bottom:24px}' +
      '.nr-row{margin:20px 0 0}' +
      '.nr-head{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:10px}' +
      '.nr-head h2{font-size:17px;font-weight:700;color:#fff;margin:0}' +
      '.nr-more{background:none;border:none;color:#e50914;font-size:13px;font-weight:600;cursor:pointer;padding:4px}' +
      '.nr-strip{display:flex;gap:10px;overflow-x:auto;padding:2px 16px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
      '.nr-strip::-webkit-scrollbar{display:none}' +
      '.nr-card{flex:0 0 128px;background:none;border:none;padding:0;text-align:left;cursor:pointer;position:relative;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
      '.nr-imgwrap{display:block;width:128px;height:186px;border-radius:10px;overflow:hidden;background:#1a1a1a;position:relative}' +
      '.nr-imgwrap img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}' +
      '.nr-title{display:block;font-size:12px;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.nr-score{display:block;font-size:11px;color:#f5c518;margin-top:2px}' +
      '.nr-num{position:absolute;left:-6px;bottom:44px;font-size:72px;font-weight:900;line-height:1;color:#000;-webkit-text-stroke:2px #fff;z-index:2;pointer-events:none;font-family:Arial, sans-serif}' +
      '.nr-overlay{position:fixed;inset:0;background:#0b0b0b;z-index:100003;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
      '.nr-ovhead{position:sticky;top:0;background:#0b0b0b;padding:12px 16px;display:flex;align-items:center;gap:14px;border-bottom:1px solid #222;z-index:2}' +
      '.nr-ovhead h2{font-size:17px;color:#fff;margin:0}' +
      '.nr-back{background:none;border:none;color:#e50914;font-size:15px;cursor:pointer}' +
      '.nr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}' +
      '.nr-grid .nr-card{flex:none;width:100%}' +
      '.nr-grid .nr-imgwrap{width:100%;height:auto;aspect-ratio:2/2.9}' +
      '.nr-ovload{text-align:center;padding:18px;color:#777;font-size:13px}';
    document.head.appendChild(st);

    // --- Init: load after app is ready ---
    var started = false;
    function init() {
      if (started) return; started = true;
      // Wait a bit for app to render home
      setTimeout(load, 1500);
    }
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
    setTimeout(init, 4000); // fallback
  })();
  </script>
`);
