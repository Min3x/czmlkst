/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'site', file), 'utf8');
const PAGES = ['index.html', 'z/index.html', 'dev/z/index.html', 'auth/callback/index.html', 'dev/auth/callback/index.html'];

describe('statyczna strona czymamlek.pl (03 §4.1, A41)', () => {
  it.each(PAGES)('%s nie łączy się z żadnym serwerem i nie wczytuje niczego z zewnątrz', (file) => {
    const html = read(file);
    expect(html).toMatch(/http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none';/);
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    // jedyne adresy bezwzględne to adresy linku zaproszenia w atrybutach <body>
    const external = [...html.matchAll(/(?:src|href)="(https?:)?\/\/[^"]*"/g)];
    expect(external).toEqual([]);
  });

  it('strony zaproszeń dev i produkcji różnią się tylko aplikacją i adresem linku', () => {
    const prod = read('z/index.html');
    const dev = read('dev/z/index.html');
    expect(prod).toContain('<body data-package-id="com.czymamlek.app" data-link-base="https://czymamlek.pl/z">');
    expect(dev).toContain('<body data-package-id="com.czymamlek.app.dev" data-link-base="https://czymamlek.pl/dev/z">');
    const withoutBody = (html) => html.replace(/<body[^>]*>/, '<body>');
    expect(withoutBody(dev)).toBe(withoutBody(prod));
  });

  it('strony po linku z emaila są takie same w obu wariantach', () => {
    expect(read('dev/auth/callback/index.html')).toBe(read('auth/callback/index.html'));
  });

  it('assetlinks.json: wersja dev z odciskiem EAS, bez publicznego klucza debug (A41)', () => {
    const statements = JSON.parse(read('.well-known/assetlinks.json'));
    const dev = statements.find((s) => s.target.package_name === 'com.czymamlek.app.dev');
    expect(dev.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(dev.target.sha256_cert_fingerprints).toEqual([
      'C9:43:DB:DE:D9:35:AE:7E:1D:CC:1D:4C:FA:1B:5C:83:85:DC:C4:AA:97:D3:53:D5:39:4C:D5:DB:25:4B:2A:43',
    ]);
    // klucz debug z szablonu React Native jest publiczny — weryfikacja całej domeny dla niego
    // oddałaby linki produkcyjne każdej aplikacji podpisanej tym kluczem
    const RN_DEBUG = 'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C';
    expect(statements.flatMap((s) => s.target.sha256_cert_fingerprints)).not.toContain(RN_DEBUG);
  });

  it('domena w CNAME', () => {
    expect(read('CNAME').trim()).toBe('czymamlek.pl');
  });
});
