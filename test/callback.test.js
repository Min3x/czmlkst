/** @jest-environment node */
const { callbackState } = require('../site/assets/callback');

describe('strona po linku z emaila (decyzja l etapu 13, UC-01)', () => {
  it('kod PKCE w zapytaniu → adres potwierdzony, wróć do aplikacji', () => {
    expect(callbackState('?code=abc', '')).toBe('confirmed');
  });

  it('wygasły albo użyty link → prośba o nowy z aplikacji', () => {
    expect(callbackState('?error=access_denied&error_code=otp_expired&error_description=x', '')).toBe('expired');
    // Auth bywa, że oddaje błąd we fragmencie
    expect(callbackState('', '#error=access_denied&error_code=otp_expired')).toBe('expired');
  });

  it('inny błąd albo pusty adres → ogólny komunikat', () => {
    expect(callbackState('?error=server_error', '')).toBe('error');
    expect(callbackState('', '')).toBe('error');
  });
});
