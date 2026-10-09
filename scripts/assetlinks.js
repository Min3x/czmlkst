#!/usr/bin/env node
// Plik weryfikacji App Links `site/.well-known/assetlinks.json` (dokumentacja aplikacji: 11 §2.4, A41). Jedna domena dla
// obu wariantów, więc plik zawiera obie aplikacje — każdą z odciskiem certyfikatu, którym jest
// podpisana. Odcisk dev: `eas credentials -p android` → profil `preview`. Produkcja dopiero
// w etapie 15 (klucz podpisu aplikacji ze Sklepu Play).
//
// Celowo bez klucza debug emulatora: jest publiczny (ten sam w każdym projekcie React Native),
// a weryfikacja obejmuje całą domenę, nie ścieżkę — obca aplikacja podpisana nim przejęłaby
// też linki produkcyjne. E2E otwiera link z jawnie wskazaną aplikacją (`am start … <pakiet>`).
//
// Użycie: npm run assetlinks -- [--dev "<SHA-256>"] [--prod "<SHA-256>"]
// Podany odcisk zastępuje odcisk wariantu; niepodany zostaje z obecnego pliku.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'site', '.well-known', 'assetlinks.json');
const PACKAGES = { development: 'com.czymamlek.app.dev', production: 'com.czymamlek.app' };
const SHA256 = /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){31}\b/;

function parseFingerprint(text) {
  // odcisk skopiowany z terminala bywa poprzerywany spacjami wokół dwukropków
  const match = SHA256.exec((text || '').replace(/\s*:\s*/g, ':'));
  if (!match) throw new Error('Brak odcisku SHA-256 certyfikatu (fingerprint) — 32 bajty szesnastkowo z dwukropkami');
  return match[0].toUpperCase();
}

function buildAssetLinks(fingerprints) {
  if (fingerprints.development.length === 0) throw new Error('Brak odcisku certyfikatu dla development');
  return Object.entries(PACKAGES)
    .filter(([variant]) => fingerprints[variant].length > 0)
    .map(([variant, packageName]) => ({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints[variant] },
    }));
}

function fingerprintsOf(statements) {
  const result = { development: [], production: [] };
  for (const [variant, packageName] of Object.entries(PACKAGES)) {
    const statement = statements.find((s) => s.target.package_name === packageName);
    if (statement) result[variant] = statement.target.sha256_cert_fingerprints;
  }
  return result;
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function main(args) {
  const current = fs.existsSync(FILE) ? fingerprintsOf(JSON.parse(fs.readFileSync(FILE, 'utf8'))) : { development: [], production: [] };
  const dev = argValue(args, '--dev');
  const prod = argValue(args, '--prod');
  const next = {
    development: dev === undefined ? current.development : [parseFingerprint(dev)],
    production: prod === undefined ? current.production : [parseFingerprint(prod)],
  };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, `${JSON.stringify(buildAssetLinks(next), null, 2)}\n`);
  console.log(`Zapisano ${path.relative(process.cwd(), FILE)}`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { buildAssetLinks, fingerprintsOf, parseFingerprint };
