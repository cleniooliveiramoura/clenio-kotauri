//! Botões flutuantes injetados no Telegram Web K.

/// JS idempotente: cria o botão ⚙ se ainda não existir.
pub fn settings_gear_js() -> &'static str {
    r#"
(function () {
  if (document.getElementById('kotauri-gear-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'kotauri-gear-btn';
  btn.type = 'button';
  btn.title = 'KoTauri Settings';
  btn.setAttribute('aria-label', 'KoTauri Settings');
  btn.setAttribute('data-testid', 'kotauri-gear-btn');
  btn.textContent = '\u2699';
  btn.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'right:20px',
    'z-index:2147483000',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'background:#3390ec',
    'color:#fff',
    'border:none',
    'cursor:pointer',
    'font-size:22px',
    'line-height:1',
    'box-shadow:0 2px 10px rgba(0,0,0,0.35)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:0'
  ].join(';');

  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };
  btn.onclick = function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (window.kotauri && typeof window.kotauri.openSettings === 'function') {
      window.kotauri.openSettings();
    } else {
      console.warn('[KoTauri] openSettings indisponível');
    }
  };

  (document.body || document.documentElement).appendChild(btn);
})();
"#
}

/// JS idempotente: botão Stories ao lado da engrenagem.
pub fn stories_button_js() -> &'static str {
    r#"
(function () {
  if (document.getElementById('kotauri-stories-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'kotauri-stories-btn';
  btn.type = 'button';
  btn.title = 'KoTauri Stories';
  btn.setAttribute('aria-label', 'KoTauri Stories');
  btn.setAttribute('data-testid', 'kotauri-stories-btn');
  btn.textContent = '\u25CE';
  btn.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'right:72px',
    'z-index:2147483000',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'background:#6C5CE7',
    'color:#fff',
    'border:none',
    'cursor:pointer',
    'font-size:20px',
    'line-height:1',
    'box-shadow:0 2px 10px rgba(0,0,0,0.35)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:0'
  ].join(';');

  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };
  btn.onclick = function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (window.kotauri && typeof window.kotauri.openStories === 'function') {
      window.kotauri.openStories();
    } else {
      console.warn('[KoTauri] openStories indisponível');
    }
  };

  (document.body || document.documentElement).appendChild(btn);
})();
"#
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gear_js_has_button_id() {
        assert!(settings_gear_js().contains("kotauri-gear-btn"));
        assert!(settings_gear_js().contains("openSettings"));
    }

    #[test]
    fn stories_js_has_button_id() {
        assert!(stories_button_js().contains("kotauri-stories-btn"));
        assert!(stories_button_js().contains("openStories"));
    }
}
