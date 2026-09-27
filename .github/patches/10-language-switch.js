// 10-language-switch.js — Language switcher (Hindi ↔ English) in video player
// Injects a separate script tag with the language switcher functionality.

const langSwitchJs = `
<script>
(function() {
// Track current playback
var __origRenderPlayer = window.renderPlayer;
if (__origRenderPlayer) {
  window.renderPlayer = function(anime, anilistId, ep, episodes, w, opts) {
    window.__curPlay = {
      anime: anime, anilistId: anilistId, ep: ep, episodes: episodes, opts: opts,
      isHindi: String(anime.animeId || '').indexOf('hindi:') === 0,
      title: anime.title || ''
    };
    __origRenderPlayer(anime, anilistId, ep, episodes, w, opts);
    setTimeout(__injectLangButton, 200);
  };
}

function __cleanTitleForSearch(t) {
  return String(t || '').replace(/\\s*\\(hindi\\)\\s*/gi, '').replace(/\\s*hindi\\s*dub\\s*/gi, '').replace(/\\s*\\[hindi\\]\\s*/gi, '').trim();
}

window.__switchLanguage = function() {
  var cur = window.__curPlay;
  if (!cur) return;
  var video = document.querySelector('.awp-video');
  var pos = video ? (video.currentTime || 0) : 0;
  var title = __cleanTitleForSearch(cur.title);
  var ep = cur.ep;
  if (cur.isHindi) {
    if (typeof apiGet !== 'function') return;
    apiGet('/api/anime/search?q=' + encodeURIComponent(title)).then(function(d) {
      var results = (d && d.results) || [];
      var en = results.filter(function(r) { return !r.hindi; })[0];
      if (!en || typeof playEpisode !== 'function') return;
      playEpisode(en, en.anilistId, ep, [], { startAt: pos });
    });
  } else {
    if (typeof apiGet !== 'function') return;
    apiGet('/api/anime/hsearch?q=' + encodeURIComponent(title)).then(function(d) {
      var results = (d && d.results) || [];
      var hi = results[0];
      if (!hi || !window.__playHindiEpisode) return;
      var hindiAnime = { animeId: hi.animeId, anilistId: hi.anilistId, title: hi.title, hindi: true, hindiSlug: hi.hindiSlug, hindiType: hi.hindiType };
      window.__playHindiEpisode(hindiAnime, ep, pos);
    });
  }
};

function __injectLangButton() {
  var topicons = document.querySelector('.awp-topicons');
  if (!topicons || document.getElementById('awpLang')) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'awp-icobtn';
  btn.id = 'awpLang';
  btn.setAttribute('aria-label', 'Switch language');
  btn.textContent = '\\uD83C\\uDF10';
  btn.onclick = function() { window.__switchLanguage(); };
  var closeBtn = topicons.querySelector('#awpClose');
  if (closeBtn) topicons.insertBefore(btn, closeBtn);
  else topicons.appendChild(btn);
  var cur = window.__curPlay;
  if (cur) btn.title = cur.isHindi ? 'Switch to English' : 'Switch to Hindi';
}

window.__playHindiEpisode = function(anime, ep, startAt) {
  var slug = anime.hindiSlug;
  var type = anime.hindiType || 'series';
  if (typeof playerBody !== 'function' || typeof closePlayerShell !== 'function') return;
  var b = playerBody();
  if (!b) return;
  b.innerHTML = '<div class="aw-player"><div class="aw-status"><span class="spinner"></span>Loading Hindi EP ' + ep + '...</div><button type="button" class="aw-back" id="awBackHi">Back</button></div>';
  b.querySelector('#awBackHi').onclick = function() { closePlayerShell(); };
  if (typeof apiGet !== 'function') return;
  apiGet('/api/anime/hwatch?slug=' + encodeURIComponent(slug) + '&type=' + type + '&ep=' + ep).then(function(w) {
    if (typeof renderPlayer === 'function') renderPlayer(anime, anime.anilistId, ep, [], w, { startAt: startAt });
  }, function(err) {
    b.innerHTML = '<div class="aw-player"><div class="aw-err">Hindi stream unavailable.</div><button type="button" class="aw-back" id="awBackHi2">Back</button></div>';
    b.querySelector('#awBackHi2').onclick = function() { closePlayerShell(); };
  });
};
})();
</script>
`;

html = html.replace('</body>', langSwitchJs + '</body>');
