// 10-language-switch.js — Language switcher (Hindi ↔ English) in video player
// Shows a popup to choose the language.

const langSwitchJs = `
<script>
(function() {
// Inject button when player appears
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
      btn.title = 'Switch language (Hindi/English)';
      btn.onclick = function() { window.__showLangPicker(); };
      var closeBtn = topicons.querySelector('#awpClose');
      if (closeBtn) topicons.insertBefore(btn, closeBtn);
      else topicons.appendChild(btn);
    }
  } catch(e) {}
}, 500);

window.__showLangPicker = function() {
  // Get current title and episode from the player
  var titleEl = document.querySelector('.awp-title');
  var title = '', ep = 1;
  if (titleEl) {
    var t = titleEl.textContent || '';
    var m = t.match(/^(.*?)\\s*[·•]\\s*EP\\s*(\\d+)/i);
    if (m) { title = m[1].trim(); ep = parseInt(m[2], 10); }
    else { title = t.trim(); }
  }
  if (!title) return;
  // Clean the title
  title = title.replace(/\\s*\\(hindi\\)\\s*/gi, '').replace(/\\s*hindi\\s*dub\\s*/gi, '').trim();
  var video = document.querySelector('.awp-video');
  var pos = video ? (video.currentTime || 0) : 0;
  
  // Show a simple picker
  var choice = confirm('Switch language for "' + title + '" EP ' + ep + '?\\n\\nOK = English\\nCancel = Hindi');
  if (typeof apiGet !== 'function') return;
  
  if (choice) {
    // Switch to English
    apiGet('/api/anime/search?q=' + encodeURIComponent(title)).then(function(d) {
      var results = (d && d.results) || [];
      var en = null;
      for (var i = 0; i < results.length; i++) {
        if (!results[i].hindi) { en = results[i]; break; }
      }
      if (!en) { alert('No English version found'); return; }
      // Try to use playEpisode if available
      if (typeof playEpisode === 'function') {
        playEpisode(en, en.anilistId, ep, [], { startAt: pos });
      } else if (window.playEpisode) {
        window.playEpisode(en, en.anilistId, ep, [], { startAt: pos });
      } else {
        alert('Cannot switch: player not ready');
      }
    });
  } else {
    // Switch to Hindi
    apiGet('/api/anime/hsearch?q=' + encodeURIComponent(title)).then(function(d) {
      var results = (d && d.results) || [];
      var hi = results[0];
      if (!hi) { alert('No Hindi version found'); return; }
      var hindiAnime = { animeId: hi.animeId, anilistId: hi.anilistId, title: hi.title, hindi: true, hindiSlug: hi.hindiSlug, hindiType: hi.hindiType };
      if (window.__playHindiEpisode) {
        window.__playHindiEpisode(hindiAnime, ep, pos);
      } else {
        alert('Hindi playback not available');
      }
    });
  }
};

window.__playHindiEpisode = function(anime, ep, startAt) {
  var slug = anime.hindiSlug;
  var type = anime.hindiType || 'series';
  var b = (typeof playerBody === 'function') ? playerBody() : document.querySelector('.awp');
  if (!b) return;
  // Use the existing Hindi watch API
  if (typeof apiGet !== 'function') return;
  apiGet('/api/anime/hwatch?slug=' + encodeURIComponent(slug) + '&type=' + type + '&ep=' + ep).then(function(w) {
    // w contains stream URL - need to render it
    // Try to find renderPlayer
    var rp = (typeof renderPlayer === 'function') ? renderPlayer : window.renderPlayer;
    if (rp) {
      rp(anime, anime.anilistId, ep, [], w, { startAt: startAt });
    } else {
      // Fallback: reload with Hindi URL
      alert('Cannot render Hindi stream');
    }
  }, function(err) {
    alert('Hindi stream unavailable');
  });
};
})();
</script>
`;

html = html.replace('</body>', langSwitchJs + '</body>');
