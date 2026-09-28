// 12-redesign-ui.js - Complete UI Redesign
// Unified Netflix-style design system for the entire app
// This file reskins: tab bar, cards, detail pages, search, library views, history

html = html.replace(
  '</body>',
  `<script>
  (function(){
    'use strict';

    /* ============ DESIGN TOKENS ============ */
    var TOKENS = {
      bg: '#0a0a0a',
      surface: '#141414',
      surface2: '#1f1f1f',
      border: '#2a2a2a',
      text: '#ffffff',
      text2: '#b3b3b3',
      text3: '#737373',
      accent: '#e50914',
      accentHover: '#f6121d',
      gold: '#f5c518',
      green: '#46d369',
      radius: '12px',
      radiusSm: '8px'
    };

    /* ============ GLOBAL STYLES ============ */
    var css = document.createElement('style');
    css.id = '__redesign_css';
    css.textContent = [
      /* Base */
      ':root{',
      '  --rd-bg:' + TOKENS.bg + ';',
      '  --rd-surface:' + TOKENS.surface + ';',
      '  --rd-surface2:' + TOKENS.surface2 + ';',
      '  --rd-border:' + TOKENS.border + ';',
      '  --rd-text:' + TOKENS.text + ';',
      '  --rd-text2:' + TOKENS.text2 + ';',
      '  --rd-accent:' + TOKENS.accent + ';',
      '  --rd-gold:' + TOKENS.gold + ';',
      '  --rd-radius:' + TOKENS.radius + ';',
      '}',
      /* App background */
      'body{background:' + TOKENS.bg + ' !important;color:' + TOKENS.text + ' !important;}',
      '.hatch-space-root{background:' + TOKENS.bg + ' !important;}',
      '',
      /* ============ BOTTOM TAB BAR ============ */
      /* Hide the top nav, create bottom tab bar */
      'nav[aria-label="Library sections"]{display:none !important;}',
      '#__rd_tabbar{',
      '  position:fixed;bottom:0;left:0;right:0;z-index:99990;',
      '  display:flex;background:rgba(10,10,10,.95);backdrop-filter:blur(20px);',
      '  border-top:1px solid ' + TOKENS.border + ';',
      '  padding:8px 4px calc(8px + env(safe-area-inset-bottom));',
      '}',
      '#__rd_tabbar button{',
      '  flex:1;background:none;border:none;color:' + TOKENS.text3 + ';',
      '  display:flex;flex-direction:column;align-items:center;gap:4px;',
      '  font-size:10px;font-weight:600;padding:6px 2px;cursor:pointer;',
      '  font-family:inherit;-webkit-tap-highlight-color:transparent;',
      '}',
      '#__rd_tabbar button .rd-ico{font-size:22px;line-height:1;}',
      '#__rd_tabbar button.active{color:' + TOKENS.text + ';}',
      '#__rd_tabbar button.active .rd-ico{color:' + TOKENS.accent + ';}',
      /* Add bottom padding to content so tabbar doesn't cover it */
      '.hatch-space-root{padding-bottom:76px !important;}',
      '',
      /* ============ SECTION HEADERS ============ */
      '.rd-sec-head{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin:24px 0 12px;}',
      '.rd-sec-head h2{font-size:18px;font-weight:700;color:' + TOKENS.text + ';margin:0;letter-spacing:-.3px;}',
      '.rd-sec-head .rd-more{background:none;border:none;color:' + TOKENS.accent + ';font-size:13px;font-weight:600;cursor:pointer;padding:4px;}',
      '',
      /* ============ POSTER CARDS ============ */
      '.rd-card{background:none;border:none;padding:0;cursor:pointer;text-align:left;font-family:inherit;-webkit-tap-highlight-color:transparent;position:relative;}',
      '.rd-card-img{width:100%;aspect-ratio:2/3;border-radius:' + TOKENS.radiusSm + ';overflow:hidden;background:' + TOKENS.surface2 + ';position:relative;}',
      '.rd-card-img img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}',
      '.rd-card-title{display:block;font-size:12px;font-weight:600;color:' + TOKENS.text + ';margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.rd-card-meta{display:block;font-size:11px;color:' + TOKENS.text2 + ';margin-top:2px;}',
      '.rd-card-score{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.75);color:' + TOKENS.gold + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;backdrop-filter:blur(4px);}',
      '.rd-card-badge{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;}',
      '.rd-card-badge.sub{background:' + TOKENS.surface2 + ';color:' + TOKENS.text2 + ';}',
      '.rd-card-badge.dub{background:' + TOKENS.accent + ';color:#fff;}',
      '',
      /* ============ HORIZONTAL ROWS ============ */
      '.rd-row{margin:0 0 8px;}',
      '.rd-strip{display:flex;gap:12px;overflow-x:auto;padding:4px 16px 12px;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}',
      '.rd-strip::-webkit-scrollbar{display:none;}',
      '.rd-strip .rd-card{flex:0 0 130px;scroll-snap-align:start;}',
      '',
      /* ============ HERO ============ */
      '.rd-hero{position:relative;height:56vh;min-height:420px;overflow:hidden;margin:-16px -16px 0;}',
      '.rd-hero-bg{position:absolute;inset:0;}',
      '.rd-hero-bg img{width:100%;height:100%;object-fit:cover;}',
      '.rd-hero-fade{position:absolute;inset:0;background:linear-gradient(to top,' + TOKENS.bg + ' 0%,transparent 40%,rgba(0,0,0,.3) 100%);}',
      '.rd-hero-content{position:absolute;bottom:0;left:0;right:0;padding:24px 20px;}',
      '.rd-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;color:' + TOKENS.accent + ';text-transform:uppercase;margin-bottom:8px;}',
      '.rd-hero-title{font-size:32px;font-weight:800;color:#fff;margin:0 0 8px;letter-spacing:-.5px;line-height:1.1;}',
      '.rd-hero-meta{display:flex;gap:12px;align-items:center;font-size:13px;color:' + TOKENS.text2 + ';margin-bottom:12px;}',
      '.rd-hero-meta .rd-match{color:' + TOKENS.green + ';font-weight:700;}',
      '.rd-hero-desc{font-size:13px;color:' + TOKENS.text2 + ';line-height:1.5;margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}',
      '.rd-hero-actions{display:flex;gap:10px;}',
      '.rd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:' + TOKENS.radiusSm + ';font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:inherit;}',
      '.rd-btn-primary{background:' + TOKENS.text + ';color:#000;}',
      '.rd-btn-accent{background:' + TOKENS.accent + ';color:#fff;}',
      '.rd-btn-ghost{background:rgba(255,255,255,.15);color:#fff;backdrop-filter:blur(4px);}',
      '',
      /* ============ NATIVE HOME RESKIN ============ */
      /* Hide Series/Movies collections from Home (they have their own tabs) */
      '.rail-stack{display:none !important;}',
      /* Hero carousel */
      '.home-carousel{border-radius:0 !important;margin:0 -16px !important;}',
      '.featured-copy h1{font-size:28px !important;font-weight:800 !important;letter-spacing:-.5px !important;}',
      /* Continue Watching section */
      '.continue-section{padding:0 16px !important;}',
      '.continue-section h2{font-size:18px !important;font-weight:700 !important;letter-spacing:-.3px !important;}',
      '',
      /* ============ DETAIL PAGE RESKIN ============ */
      '.awd-hero{background:' + TOKENS.bg + ' !important;}',
      '.awd-tabs{border-bottom:1px solid ' + TOKENS.border + ' !important;}',
      '.awd-tab{color:' + TOKENS.text2 + ' !important;}',
      '.awd-tab.active{color:' + TOKENS.text + ' !important;border-bottom-color:' + TOKENS.accent + ' !important;}',
      '',
      /* ============ SEARCH RESKIN ============ */
      '.aw-overlay{background:rgba(0,0,0,.92) !important;}',
      '.aw-box{background:' + TOKENS.bg + ' !important;border:1px solid ' + TOKENS.border + ' !important;}',
      '.aw-card{background:' + TOKENS.surface + ' !important;border-color:' + TOKENS.border + ' !important;border-radius:' + TOKENS.radiusSm + ' !important;}',
      '.aw-card-t{color:' + TOKENS.text + ' !important;}',
      '.aw-search input{background:' + TOKENS.surface + ' !important;border:1px solid ' + TOKENS.border + ' !important;color:' + TOKENS.text + ' !important;border-radius:' + TOKENS.radiusSm + ' !important;}',
      '',
      /* ============ CONTINUE WATCHING RESKIN ============ */
      '.continue-card{background:' + TOKENS.surface + ' !important;border-radius:' + TOKENS.radiusSm + ' !important;overflow:hidden;}',
      '.continue-progress{background:' + TOKENS.border + ' !important;}',
      '.continue-progress i{background:' + TOKENS.accent + ' !important;}',
      '',
      /* ============ EPISODE CARDS RESKIN ============ */
      '.awd-eps > *{background:' + TOKENS.surface + ' !important;border:1px solid ' + TOKENS.border + ' !important;border-radius:' + TOKENS.radiusSm + ' !important;}',
      '',
      /* ============ BUTTONS ============ */
      'button{background:none;}',
      '.awd-actions button, .aw-lang-btns button{border-radius:' + TOKENS.radiusSm + ' !important;}',
      '',
      /* Hide old top nav spacing */
      '.topbar{padding-top:12px !important;}'
    ].join('\\n');
    document.head.appendChild(css);

    /* ============ BOTTOM TAB BAR ============ */
    var TABS = [
      { id: 'all', label: 'Home', icon: '🏠' },
      { id: 'ultimate-search', label: 'Search', icon: '🔍' },
      { id: 'shows', label: 'Shows', icon: '📺' },
      { id: 'movies', label: 'Movies', icon: '🎬' },
      { id: 'history', label: 'History', icon: '🕐' }
    ];

    function buildTabBar() {
      if (document.getElementById('__rd_tabbar')) return;
      var bar = document.createElement('div');
      bar.id = '__rd_tabbar';
      TABS.forEach(function(t){
        var b = document.createElement('button');
        b.setAttribute('data-rd-tab', t.id);
        b.innerHTML = '<span class="rd-ico">' + t.icon + '</span><span>' + t.label + '</span>';
        b.addEventListener('click', function(){
          if (t.id === 'ultimate-search') {
            if (window.openAnimeWatchShell) window.openAnimeWatchShell('');
          } else if (window.__nativeSetTab) {
            window.__nativeSetTab(t.id);
          }
          updateActiveTab(t.id);
        });
        bar.appendChild(b);
      });
      document.body.appendChild(bar);
      updateActiveTab('all');
    }

    function updateActiveTab(id) {
      var btns = document.querySelectorAll('#__rd_tabbar button');
      btns.forEach(function(b){
        b.classList.toggle('active', b.getAttribute('data-rd-tab') === id);
      });
    }

    // Watch for tab changes via the hidden nav
    function watchTabs() {
      var observer = new MutationObserver(function(){
        var active = document.querySelector('nav[aria-label="Library sections"] button.active');
        if (active) {
          var tabId = active.getAttribute('data-tab') || 'all';
          updateActiveTab(tabId);
        }
      });
      var nav = document.querySelector('nav[aria-label="Library sections"]');
      if (nav) observer.observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    /* ============ INIT ============ */
    function init() {
      buildTabBar();
      watchTabs();
      // Re-build tab bar if React wipes it (every 3s check)
      setInterval(function(){
        if (!document.getElementById('__rd_tabbar')) buildTabBar();
      }, 3000);
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
    setTimeout(init, 3000);
  })();
  </script>
</body>
`);
