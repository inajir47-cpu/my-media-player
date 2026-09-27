// 10-language-switch.js — Language switcher (Hindi ↔ English)
// Styled modal matching app theme + player button

const langSwitchJs = `
<script>
(function() {
// --- Styles for language picker (matches app theme) ---
var __langCss = document.createElement('style');
__langCss.textContent = '.aw-lang-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}' +
'.aw-lang-box{background:#171b23;border:1px solid #2e3440;border-radius:14px;max-width:380px;width:100%;padding:20px}' +
'.aw-lang-title{font-size:16px;font-weight:800;margin-bottom:8px;color:#fff}' +
'.aw-lang-msg{font-size:13px;color:#b8b3aa;line-height:1.55;margin-bottom:18px}' +
'.aw-lang-btns{display:flex;gap:10px}' +
'.aw-lang-btn{flex:1;border-radius:8px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid #2e3440}' +
'.aw-lang-en{background:#f2994a;border-color:#f2994a;color:#111}' +
'.aw-lang-hi{background:#23262e;color:#fff}' +
'.aw-lang-cancel{margin-top:10px;width:100%;background:transparent;border:none;color:#888;font-size:12px;cursor:pointer;padding:8px}';
document.head.appendChild(__langCss);

// Show styled language picker, cb('en'|'hi'|null)
window.__langPicker = function(title, ep, cb) {
  var old = document.getElementById('awLangOverlay');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.className = 'aw-lang-overlay';
  ov.id = 'awLangOverlay';
  ov.innerHTML = '<div class="aw-lang-box">' +
    '<div class="aw-lang-title">\\uD83C\\uDF10 Choose Language</div>' +
    '<div class="aw-lang-msg">Play "' + String(title).replace(/</g,'&lt;') + '" EP ' + ep + ' in:</div>' +
    '<div class="aw-lang-btns">' +
    '<button type="button" class="aw-lang-btn aw-lang-en" id="awLangEn">English</button>' +
    '<button type="button" class="aw-lang-btn aw-lang-hi" id="awLangHi">\\u0939\\u093F\\u0928\\u094D\\u0926\\u0940 (Hindi)</button>' +
    '</div>' +
    '<button type="button" class="aw-lang-cancel" id="awLangCancel">Cancel</button>' +
    '</div>';
  document.body.appendChild(ov);
  var done = function(v) { ov.remove(); cb(v); };
  ov.querySelector('#awLangEn').onclick = function() { done('en'); };
  ov.querySelector('#awLangHi').onclick = function() { done('hi'); };
  ov.querySelector('#awLangCancel').onclick = function() { done(null); };
  ov.addEventListener('click', function(e) { if (e.target === ov) done(null); });
};

// --- Part 1: Player language switch button ---
setInterval(function() {
  try {
    var topicons = document.querySelector('.awp-topicons');
    if (topicons && !document.getElementById('awpLang')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'awp-icobtn';
      btn.id = 'awpLang';
      btn.setAttribute('aria-label', 'Switch language');
      btn.textContent = '\\uD83C\\uDF10';
      btn.title = 'Switch language';
      btn.onclick = function() { window.__switchLangInPlayer(); };
      var closeBtn = topicons.querySelector('#awpClose');
      if (closeBtn) topicons.insertBefore(btn, closeBtn);
      else topicons.appendChild(btn);
    }
  } catch(e) {}
}, 500);

// --- Part 2: Intercept playEpisode to show language choice ---
var __origPlayEpisode = null;
var __playEpisodeWrapped = false;
setInterval(function() {
  try {
    if (!__playEpisodeWrapped && window.playEpisode && window.playEpisode !== window.__wrappedPlayEpisode) {
      __origPlayEpisode = window.playEpisode;
      window.__wrappedPlayEpisode = function(anime, anilistId, ep, episodes, opts) {
        if (opts && opts.__langChosen) {
          return __origPlayEpisode(anime, anilistId, ep, episodes, opts);
        }
        var title = (anime && anime.title) || 'this anime';
        window.__langPicker(title, ep, function(choice) {
          if (choice === 'en') {
            opts = opts || {};
            opts.__langChosen = true;
            __origPlayEpisode(anime, anilistId, ep, episodes, opts);
          } else if (choice === 'hi') {
            var cleanTitle = String(title).replace(/\\s*\\(hindi\\)\\s*/gi, '').trim();
            if (typeof apiGet === 'function') {
              apiGet('/api/anime/hsearch?q=' + encodeURIComponent(cleanTitle)).then(function(d) {
                var results = (d && d.results) || [];
                var hi = results[0];
                if (!hi) { alert('No Hindi version found'); return; }
                var hindiAnime = { animeId: hi.animeId, anilistId: hi.anilistId, title: hi.title, hindi: true, hindiSlug: hi.hindiSlug, hindiType: hi.hindiType };
                window.__playHindiEpisode(hindiAnime, ep, 0);
              });
            }
          }
        });
      };
      window.playEpisode = window.__wrappedPlayEpisode;
      __playEpisodeWrapped = true;
    }
  } catch(e) {}
}, 500);

// --- Part 3: Switch language from player ---
window.__switchLangInPlayer = function() {
  var titleEl = document.querySelector('.awp-title');
  var title = '', ep = 1;
  if (titleEl) {
    var t = titleEl.textContent || '';
    var m = t.match(/^(.*?)\\s*[·•]\\s*EP\\s*(\\d+)/i);
    if (m) { title = m[1].trim(); ep = parseInt(m[2], 10); }
    else { title = t.trim(); }
  }
  if (!title) return;
  title = title.replace(/\\s*\\(hindi\\)\\s*/gi, '').trim();
  var video = document.querySelector('.awp-video');
  var pos = video ? (video.currentTime || 0) : 0;
  window.__langPicker(title, ep, function(choice) {
    if (typeof apiGet !== 'function') return;
    if (choice === 'en') {
      apiGet('/api/anime/search?q=' + encodeURIComponent(title)).then(function(d) {
        var results = (d && d.results) || [];
        var en = null;
        for (var i = 0; i < results.length; i++) {
          if (!results[i].hindi) { en = results[i]; break; }
        }
        if (!en) { alert('No English version found'); return; }
        if (__origPlayEpisode) {
          __origPlayEpisode(en, en.anilistId, ep, [], { startAt: pos, __langChosen: true });
        }
      });
    } else if (choice === 'hi') {
      apiGet('/api/anime/hsearch?q=' + encodeURIComponent(title)).then(function(d) {
        var results = (d && d.results) || [];
        var hi = results[0];
        if (!hi) { alert('No Hindi version found'); return; }
        var hindiAnime = { animeId: hi.animeId, anilistId: hi.anilistId, title: hi.title, hindi: true, hindiSlug: hi.hindiSlug, hindiType: hi.hindiType };
        window.__playHindiEpisode(hindiAnime, ep, pos);
      });
    }
  });
};

window.__playHindiEpisode = function(anime, ep, startAt) {
  var slug = anime.hindiSlug;
  var type = anime.hindiType || 'series';
  if (typeof apiGet !== 'function') return;
  var pb = (typeof playerBody === 'function') ? playerBody() : null;
  if (pb) {
    pb.innerHTML = '<div class="aw-player"><div class="aw-status"><span class="spinner"></span>Loading Hindi EP ' + ep + '...</div></div>';
  }
  apiGet('/api/anime/hwatch?slug=' + encodeURIComponent(slug) + '&type=' + type + '&ep=' + ep).then(function(w) {
    // The hwatch returns stream info - try to play via the Hindi flow
    // For now, show the stream is ready
    if (pb) {
      pb.innerHTML = '<div class="aw-player"><div class="aw-err">Hindi stream loaded. Player integration needed.</div></div>';
    }
  }, function(err) {
    if (pb) {
      pb.innerHTML = '<div class="aw-player"><div class="aw-err">Hindi stream unavailable.</div></div>';
    }
  });
};
})();
</script>
`;

html = html.replace('</body>', langSwitchJs + '</body>');
