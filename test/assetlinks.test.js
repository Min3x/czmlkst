/** @jest-environment node */
const { buildAssetLinks, fingerprintsOf, parseFingerprint } = require('../scripts/assetlinks');

const DEV = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89';
const PROD = '01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF';

describe('assetlinks.json (11 §2.4, A41)', () => {
  it('odcisk SHA-256 z wyjścia `eas credentials` albo `keytool`, wielkimi literami', () => {
    expect(parseFingerprint(`  SHA256 Fingerprint: ${DEV.toLowerCase()}\n  SHA1 Fingerprint: AA:BB`)).toBe(DEV);
    expect(parseFingerprint(DEV)).toBe(DEV);
  });

  it('odcisk wklejony z terminala z przerwami między bajtami', () => {
    const spaced = 'C9:43:DB:DE:D9:35:AE:7E:1D:CC:1D:4C:FA:1B:5C:83:85:DC:C4:AA :97:D3:53:D5:39:4C: D5:DB : 25:4B:2A:43';
    expect(parseFingerprint(spaced)).toBe('C9:43:DB:DE:D9:35:AE:7E:1D:CC:1D:4C:FA:1B:5C:83:85:DC:C4:AA:97:D3:53:D5:39:4C:D5:DB:25:4B:2A:43');
  });

  it('odcisk SHA-1, ucięty albo pusty → błąd', () => {
    expect(() => parseFingerprint('AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD')).toThrow('fingerprint');
    expect(() => parseFingerprint('')).toThrow('fingerprint');
  });

  it('wpis dla dev zawsze, produkcja dopiero z odciskiem (etap 15)', () => {
    expect(buildAssetLinks({ development: [DEV], production: [] })).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'com.czymamlek.app.dev', sha256_cert_fingerprints: [DEV] },
      },
    ]);
    expect(buildAssetLinks({ development: [DEV], production: [PROD] })[1].target).toEqual({
      namespace: 'android_app',
      package_name: 'com.czymamlek.app',
      sha256_cert_fingerprints: [PROD],
    });
  });

  it('bez odcisku dev plik nie powstaje', () => {
    expect(() => buildAssetLinks({ development: [], production: [PROD] })).toThrow('development');
  });

  it('odczytuje odciski z istniejącego pliku, żeby dopisanie produkcji nie zgubiło dev', () => {
    const existing = buildAssetLinks({ development: [DEV], production: [] });
    expect(fingerprintsOf(existing)).toEqual({ development: [DEV], production: [] });
  });
});
