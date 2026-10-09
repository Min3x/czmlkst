// Strona `auth/callback` otwiera się tylko wtedy, gdy link z emaila nie trafił do aplikacji —
// zwykle na komputerze (UC-01). Supabase potwierdził już adres, zanim tu przekierował, więc
// strona mówi „wróć do aplikacji". Kodu PKCE nie używa: bez weryfikatora z telefonu jest
// bezużyteczny (03 §11), a z paska adresu i historii przeglądarki go usuwamy.
'use strict';

function callbackState(search, hash) {
  const params = new URLSearchParams(search || '');
  const fragment = new URLSearchParams((hash || '').replace(/^#/, ''));
  const errorCode = params.get('error_code') || fragment.get('error_code');
  if (errorCode === 'otp_expired') return 'expired';
  if (params.get('error') || fragment.get('error')) return 'error';
  return params.get('code') ? 'confirmed' : 'error';
}

function start(doc, loc, history) {
  const state = callbackState(loc.search, loc.hash);
  history.replaceState(null, '', loc.pathname);
  doc.getElementById(`callback-${state}`).hidden = false;
}

if (typeof module === 'object' && module.exports) {
  module.exports = { callbackState, start };
} else {
  start(document, location, window.history);
}
