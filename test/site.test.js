/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'site', file), 'utf8');
const DELETE_PAGES = ['index.html', 'wyslano/index.html', 'potwierdz/index.html', 'przyjeto/index.html'].map((page) => `dev/usun-konto/${page}`);
const PAGES = ['index.html', 'z/index.html', 'dev/z/index.html', 'auth/callback/index.html', 'dev/auth/callback/index.html', ...DELETE_PAGES];
// Projekt Supabase dev (eu-west-1) — jedyny adres, na który strona cokolwiek wysyła.
const DEV_FUNCTIONS = 'https://lkzyfklwdvlofaizjqua.supabase.co';
const FORM_PAGES = ['dev/usun-konto/index.html', 'dev/usun-konto/potwierdz/index.html'];

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

describe('strona usunięcia konta (UC-33, 03 §5.1, 11 §2.4)', () => {
  const csp = (html) => html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const inputs = (html) =>
    [...html.matchAll(/<input[^>]*>/g)].map((m) => ({ type: attr(m[0], 'type'), name: attr(m[0], 'name'), value: attr(m[0], 'value') }));

  it.each(FORM_PAGES)('%s: formularz wysyła POST wyłącznie do funkcji account-mail w eu-west-1', (file) => {
    const html = read(file);
    // 'self': odpowiedzią funkcji jest przekierowanie na wyslano/ albo przyjeto/, a przeglądarki
    // sprawdzają form-action także dla celu przekierowania — bez tego osoba utknęłaby po wysłaniu
    expect(csp(html)).toBe(`default-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self' ${DEV_FUNCTIONS}`);
    const forms = [...html.matchAll(/<form[^>]*>/g)].map((m) => m[0]);
    expect(forms).toHaveLength(1);
    // GET niczego nie zmienia — skanery poczty otwierają linki (03 §5.1)
    expect(attr(forms[0], 'method')).toBe('post');
    expect(attr(forms[0], 'action')).toBe(`${DEV_FUNCTIONS}/functions/v1/account-mail?forceFunctionRegion=eu-west-1`);
    // przycisk włącza dopiero skrypt, po sprawdzeniu, że strona nie jest w ramce
    expect(html).toMatch(/<button[^>]*\sid="delete-submit"[^>]*\sdisabled>/);
    expect(html).toContain('<script src="/assets/delete.js"></script>');
  });

  it('prośba wysyła tylko adres email, potwierdzenie tylko token', () => {
    expect(inputs(read('dev/usun-konto/index.html'))).toEqual([
      { type: 'hidden', name: 'action', value: 'request' },
      { type: 'email', name: 'email', value: undefined },
    ]);
    expect(inputs(read('dev/usun-konto/potwierdz/index.html'))).toEqual([
      { type: 'hidden', name: 'action', value: 'confirm' },
      { type: 'hidden', name: 'token', value: undefined },
    ]);
  });

  it('pozostałe strony nie mają formularzy i niczego nie wysyłają', () => {
    for (const file of PAGES.filter((page) => !FORM_PAGES.includes(page))) {
      expect(csp(read(file))).toContain("form-action 'none'");
    }
    for (const file of ['dev/usun-konto/wyslano/index.html', 'dev/usun-konto/przyjeto/index.html']) {
      expect(read(file)).not.toMatch(/<form|<script/);
    }
  });

  it('odpowiedź po formularzu nie zdradza, czy konto istnieje ani czy link był ważny', () => {
    expect(read('dev/usun-konto/wyslano/index.html')).toContain('Jeśli na ten adres jest konto CzyMamLek');
    expect(read('dev/usun-konto/przyjeto/index.html')).toContain('Jeśli link był ważny');
  });

  it('strona mówi, co jest usuwane i co zostaje (wymóg Sklepu Play)', () => {
    const html = read('dev/usun-konto/index.html');
    expect(html).toContain('po 7 dniach');
    expect(html).toContain('przez 3 lata');
  });
});

describe('wdrożenie (.github/workflows/pages.yml)', () => {
  it('paczka Pages zawiera katalogi z kropką — inaczej /.well-known/assetlinks.json daje 404', () => {
    const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
    // v4 nie zna include-hidden-files i po cichu pomija .well-known (wykryte przy pierwszym wdrożeniu)
    expect(workflow).toMatch(/actions\/upload-pages-artifact@v5\s/);
    expect(workflow).toMatch(/include-hidden-files: true/);
  });
});
