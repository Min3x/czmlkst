// Strona pod linkiem zaproszenia (03 §4.1). Nie pyta serwera aplikacji o nic: czyta token
// z fragmentu `#`, na Androidzie prowadzi do Sklepu Play z tokenem w `referrer`, a na innych
// systemach rysuje lokalnie kod QR tego samego linku. Funkcje są czyste, żeby testował je Jest.
'use strict';

// W przeglądarce biblioteka jest wczytana wcześniejszym <script> (globalne `qrcode`), w Jest — przez require.
const qrcodeLib = typeof qrcode === 'function' ? qrcode : require('./qrcode-generator.js');

// Ten sam format co w aplikacji (repozytorium aplikacji, src/domain/invites.ts): 32 bajty
// w base64url = 43 znaki. Zmiana tu wymaga zmiany tam.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function readToken(hash) {
  const token = typeof hash === 'string' && hash.startsWith('#') ? hash.slice(1) : '';
  return TOKEN_PATTERN.test(token) ? token : null;
}

function isAndroid(userAgent) {
  return /\bAndroid\b/i.test(userAgent || '');
}

// Play Install Referrer oddaje aplikacji wartość `referrer` po instalacji (decyzja c, A42).
function playStoreUrl(packageId, token) {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageId)}&referrer=${encodeURIComponent(`invite=${token}`)}`;
}

/** Macierz modułów kodu QR (true = ciemny), poziom korekcji M, wersja dobrana do długości. */
function qrModules(text) {
  const code = qrcodeLib(0, 'M');
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  const rows = [];
  for (let row = 0; row < size; row += 1) {
    const cells = [];
    for (let col = 0; col < size; col += 1) cells.push(code.isDark(row, col));
    rows.push(cells);
  }
  return rows;
}

// Cicha strefa 4 modułów wymagana przez skanery.
const QUIET_ZONE = 4;
const SVG_NS = 'http://www.w3.org/2000/svg';

function drawQr(doc, container, text) {
  const modules = qrModules(text);
  const size = modules.length + 2 * QUIET_ZONE;
  let pathData = '';
  modules.forEach((cells, row) => {
    cells.forEach((dark, col) => {
      if (dark) pathData += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    });
  });
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Kod QR zaproszenia');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = doc.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', String(size));
  background.setAttribute('height', String(size));
  background.setAttribute('class', 'qr-light');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('class', 'qr-dark');
  svg.append(background, path);
  container.replaceChildren(svg);
}

function show(doc, id) {
  doc.getElementById(id).hidden = false;
}

/** Wariant strony (`/z` albo `/dev/z`) jest w atrybutach `<body>`: identyfikator aplikacji i adres linku. */
function start(doc, userAgent, hash) {
  const token = readToken(hash);
  if (token === null) return show(doc, 'invite-invalid');
  const { packageId, linkBase } = doc.body.dataset;
  if (isAndroid(userAgent)) {
    doc.getElementById('store-link').href = playStoreUrl(packageId, token);
    return show(doc, 'invite-android');
  }
  drawQr(doc, doc.getElementById('qr'), `${linkBase}#${token}`);
  return show(doc, 'invite-qr');
}

if (typeof module === 'object' && module.exports) {
  module.exports = { isAndroid, playStoreUrl, qrModules, readToken, start };
} else {
  start(document, navigator.userAgent, location.hash);
}
