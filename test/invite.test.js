/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { isAndroid, playStoreUrl, qrModules, readToken, start } = require('../site/assets/invite');

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';

describe('strona zaproszeń (03 §4.1)', () => {
  it('token tylko z fragmentu: dokładnie 43 znaki base64url', () => {
    expect(readToken(`#${TOKEN}`)).toBe(TOKEN);
    expect(readToken('')).toBeNull();
    expect(readToken('#')).toBeNull();
    expect(readToken(`#${TOKEN}x`)).toBeNull();
    expect(readToken(`#${TOKEN.slice(1)}`)).toBeNull();
    expect(readToken(`#${TOKEN.slice(1)}+`)).toBeNull();
    expect(readToken(`#${TOKEN.slice(1)}=`)).toBeNull();
    expect(readToken(`# ${TOKEN.slice(1)}`)).toBeNull();
    expect(readToken(TOKEN)).toBeNull();
  });

  it('rozpoznaje Androida po user agencie', () => {
    expect(isAndroid('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36')).toBe(true);
    expect(isAndroid('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15')).toBe(false);
    expect(isAndroid('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36')).toBe(false);
    expect(isAndroid('')).toBe(false);
  });

  it('link do Sklepu Play niesie token w parametrze referrer (Install Referrer)', () => {
    expect(playStoreUrl('com.czymamlek.app.dev', TOKEN)).toBe(
      `https://play.google.com/store/apps/details?id=com.czymamlek.app.dev&referrer=invite%3D${TOKEN}`,
    );
  });

  it('kod QR rysowany lokalnie: siatka modułów z wzorcami pozycji w rogach', () => {
    const modules = qrModules(`https://czymamlek.pl/dev/z#${TOKEN}`);
    // 70 bajtów przy poziomie M mieści się w wersji 5 → 17 + 4·5 = 37 modułów
    expect(modules).toHaveLength(37);
    modules.forEach((row) => expect(row).toHaveLength(37));
    const finder = (top, left) => [0, 6].every((d) => modules[top + d][left] && modules[top][left + d]);
    expect(finder(0, 0)).toBe(true);
    expect(finder(0, 30)).toBe(true);
    expect(finder(30, 0)).toBe(true);
  });

  it('kopia biblioteki QR na stronie jest taka sama jak w pakiecie (A40, bez CDN)', () => {
    // końce linii mogą zmienić się przy pobraniu repozytorium na Windows (core.autocrlf)
    const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    expect(read(path.join(__dirname, '..', 'site', 'assets', 'qrcode-generator.js'))).toBe(read(require.resolve('qrcode-generator')));
  });

  describe('start — wybór widoku bez zapytań do serwera', () => {
    // Najmniejszy dokument, jakiego potrzebuje strona: sekcje z `hidden`, link do Sklepu, kontener QR.
    function fakeDocument() {
      const elements = {};
      const element = (tag) => ({
        tag,
        hidden: true,
        attributes: {},
        children: [],
        setAttribute(name, value) { this.attributes[name] = value; },
        append(...nodes) { this.children.push(...nodes); },
        replaceChildren(...nodes) { this.children = nodes; },
      });
      for (const id of ['invite-invalid', 'invite-android', 'invite-qr', 'store-link', 'qr']) elements[id] = element('div');
      return {
        elements,
        body: { dataset: { packageId: 'com.czymamlek.app.dev', linkBase: 'https://czymamlek.pl/dev/z' } },
        getElementById: (id) => elements[id],
        createElementNS: (_ns, tag) => element(tag),
      };
    }
    const visible = (doc) => Object.keys(doc.elements).filter((id) => id.startsWith('invite-') && !doc.elements[id].hidden);

    it('bez poprawnego tokenu — tylko komunikat o niepełnym linku', () => {
      const doc = fakeDocument();
      start(doc, 'Android', '#za-krotki');
      expect(visible(doc)).toEqual(['invite-invalid']);
    });

    it('Android — link do Sklepu Play wariantu strony', () => {
      const doc = fakeDocument();
      start(doc, 'Mozilla/5.0 (Linux; Android 14)', `#${TOKEN}`);
      expect(visible(doc)).toEqual(['invite-android']);
      expect(doc.elements['store-link'].href).toBe(playStoreUrl('com.czymamlek.app.dev', TOKEN));
    });

    it('inny system — kod QR pełnego linku z cichą strefą', () => {
      const doc = fakeDocument();
      start(doc, 'Mozilla/5.0 (Windows NT 10.0)', `#${TOKEN}`);
      expect(visible(doc)).toEqual(['invite-qr']);
      const [svg] = doc.elements.qr.children;
      expect(svg.attributes.viewBox).toBe('0 0 45 45');
    });
  });
});
