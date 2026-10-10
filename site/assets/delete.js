// Strony usunięcia konta (UC-33, repozytorium aplikacji: 03 §5.1, 11 §2.4). Strona sama niczego
// nie usuwa: formularz wysyła POST do funkcji `account-mail`. Skrypt robi dwie rzeczy:
//  - na stronie potwierdzenia przenosi token z fragmentu `#` do ukrytego pola i czyści adres,
//  - włącza przycisk dopiero, gdy strona nie jest osadzona w ramce — CSP w <meta> nie obsługuje
//    `frame-ancestors`, a GitHub Pages nie ustawia nagłówków, więc to jedyna ochrona przed
//    wyłudzeniem kliknięcia.
'use strict';

// Ten sam format co token zaproszenia: 32 bajty w base64url = 43 znaki (funkcja account-mail).
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function readToken(hash) {
  const token = typeof hash === 'string' && hash.startsWith('#') ? hash.slice(1) : '';
  return TOKEN_PATTERN.test(token) ? token : null;
}

function refuse(doc, messageId) {
  doc.getElementById('delete-form').hidden = true;
  doc.getElementById(messageId).hidden = false;
}

function start(doc, loc, history, win) {
  const tokenField = doc.getElementById('delete-token');
  const token = tokenField === null ? null : readToken(loc.hash);
  // token (także zły) nie zostaje w pasku adresu ani w historii przeglądarki
  if (tokenField !== null) history.replaceState(null, '', loc.pathname);

  if (win.top !== win.self) return refuse(doc, 'delete-framed');
  if (tokenField !== null) {
    if (token === null) return refuse(doc, 'delete-invalid');
    tokenField.value = token;
  }
  doc.getElementById('delete-submit').disabled = false;
}

if (typeof module === 'object' && module.exports) {
  module.exports = { readToken, start };
} else {
  start(document, location, window.history, window);
}
