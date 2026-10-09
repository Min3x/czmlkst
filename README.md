# czymamlek-strona

Statyczna strona **czymamlek.pl** dla aplikacji CzyMamLek. Same pliki, bez serwera i bez budowania —
da się ją przenieść na dowolny hosting plików statycznych z HTTPS. Dziś: GitHub Pages.

Wymagania i decyzje są w dokumentacji repozytorium aplikacji: `docs/design/03-bezpieczenstwo.md` §4.1,
`docs/design/11-srodowisko.md` §2.4, decyzje A40 i A41.

## Co tu jest

| Ścieżka (`site/`) | Po co |
|---|---|
| `z/`, `dev/z/` | link zaproszenia `https://czymamlek.pl[/dev]/z#<token>` bez zainstalowanej aplikacji: na Androidzie Sklep Play z tokenem w `referrer`, gdzie indziej kod QR rysowany lokalnie |
| `auth/callback/`, `dev/auth/callback/` | link z emaila otwarty na komputerze: „Adres potwierdzony — wróć do aplikacji” |
| `.well-known/assetlinks.json` | weryfikacja Android App Links dla `com.czymamlek.app.dev` (i `com.czymamlek.app` od etapu 15) |
| `assets/qrcode-generator.js` | kopia biblioteki `qrcode-generator` z `node_modules` (A40) — bez CDN |

## Zasady

- **Token tylko we fragmencie `#`** — przeglądarka nie wysyła go serwerowi, więc nie ma go w logach.
- **Strona nie łączy się z niczym**: CSP `default-src 'self'; connect-src 'none'`, bez analityki
  i czcionek z zewnątrz, `referrer` wyłączony. Pilnuje tego `test/site.test.js`.
- **Format tokenu i ścieżki** (`/z`, `/dev/z`, `/auth/callback`) muszą się zgadzać z aplikacją
  (`src/domain/invites.ts`, `src/domain/appLinks.ts`). Zmiana po jednej stronie wymaga zmiany po drugiej.
- **Bez klucza debug w `assetlinks.json`** — jest publiczny, a weryfikacja obejmuje całą domenę.

## Polecenia

```bash
npm ci
npm test
npm run assetlinks -- --dev "<SHA-256 z eas credentials, profil preview>"
```

Po aktualizacji `qrcode-generator` skopiuj `node_modules/qrcode-generator/dist/qrcode.js` do
`site/assets/qrcode-generator.js` — test porówna obie kopie.

## Wdrożenie

`.github/workflows/pages.yml`: testy przy każdym pushu i PR, wdrożenie z `main`. Raz w ustawieniach
repozytorium: Pages → źródło „GitHub Actions”, domena `czymamlek.pl` (plik `site/CNAME`), DNS u
rejestratora na GitHub Pages (rekordy A/AAAA i `www` CNAME). Sprawdzenie:

```bash
curl -I https://czymamlek.pl/.well-known/assetlinks.json
```
