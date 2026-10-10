/** @jest-environment node */
const { readToken, start } = require('../site/assets/delete');

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';
const CONFIRM_IDS = ['delete-form', 'delete-submit', 'delete-token', 'delete-invalid', 'delete-framed', 'delete-unavailable'];
const REQUEST_IDS = ['delete-form', 'delete-submit', 'delete-framed', 'delete-unavailable'];
const ACTION = 'https://example.supabase.co/functions/v1/account-mail?forceFunctionRegion=eu-west-1';

// Tyle strony, ile dotyka skrypt: elementy po identyfikatorze, w stanie z pliku HTML.
function page(ids, action) {
  const elements = Object.fromEntries(ids.map((id) => [id, { hidden: id !== 'delete-form', disabled: id === 'delete-submit', value: '' }]));
  elements['delete-form'].getAttribute = (name) => (name === 'action' ? action : null);
  return { elements, getElementById: (id) => elements[id] ?? null };
}

function run({ ids, hash = '', framed = false, action = ACTION }) {
  const doc = page(ids, action);
  const replaced = [];
  const self = {};
  start(doc, { hash, pathname: '/dev/usun-konto/potwierdz/' }, { replaceState: (...args) => replaced.push(args) }, { self, top: framed ? {} : self });
  return { ...doc.elements, replaced };
}

describe('strona usunięcia konta (UC-33, 03 §5.1)', () => {
  it('token tylko z fragmentu: dokładnie 43 znaki base64url', () => {
    expect(readToken(`#${TOKEN}`)).toBe(TOKEN);
    expect(readToken('')).toBeNull();
    expect(readToken(`#${TOKEN}x`)).toBeNull();
    expect(readToken(`#${TOKEN.slice(1)}`)).toBeNull();
    expect(readToken(`#${TOKEN.slice(1)}+`)).toBeNull();
    expect(readToken(TOKEN)).toBeNull();
  });

  it('potwierdzenie: token z fragmentu trafia do ukrytego pola, a z paska adresu i historii znika', () => {
    const result = run({ ids: CONFIRM_IDS, hash: `#${TOKEN}` });
    expect(result['delete-token'].value).toBe(TOKEN);
    expect(result.replaced).toEqual([[null, '', '/dev/usun-konto/potwierdz/']]);
    expect(result['delete-submit'].disabled).toBe(false);
    expect(result['delete-form'].hidden).toBe(false);
    expect(result['delete-invalid'].hidden).toBe(true);
  });

  it('potwierdzenie bez tokenu albo ze złym: komunikat zamiast formularza, przycisk nieaktywny', () => {
    for (const hash of ['', '#za-krotki', `#${TOKEN}=`]) {
      const result = run({ ids: CONFIRM_IDS, hash });
      expect(result['delete-token'].value).toBe('');
      expect(result['delete-submit'].disabled).toBe(true);
      expect(result['delete-form'].hidden).toBe(true);
      expect(result['delete-invalid'].hidden).toBe(false);
      // także zły fragment nie zostaje w adresie
      expect(result.replaced).toHaveLength(1);
    }
  });

  it('prośba: przycisk włącza dopiero skrypt, adres strony bez zmian', () => {
    const result = run({ ids: REQUEST_IDS });
    expect(result['delete-submit'].disabled).toBe(false);
    expect(result['delete-framed'].hidden).toBe(true);
    expect(result.replaced).toEqual([]);
  });

  it('strona osadzona w ramce: formularz nieaktywny (meta CSP nie zna frame-ancestors)', () => {
    const request = run({ ids: REQUEST_IDS, framed: true });
    expect(request['delete-submit'].disabled).toBe(true);
    expect(request['delete-form'].hidden).toBe(true);
    expect(request['delete-framed'].hidden).toBe(false);

    const confirm = run({ ids: CONFIRM_IDS, hash: `#${TOKEN}`, framed: true });
    expect(confirm['delete-token'].value).toBe('');
    expect(confirm['delete-submit'].disabled).toBe(true);
    expect(confirm['delete-form'].hidden).toBe(true);
    expect(confirm.replaced).toHaveLength(1);
  });

  // Para produkcyjna istnieje przed projektem produkcyjnym: formularz nie ma jeszcze adresu funkcji.
  it('formularz bez adresu funkcji: komunikat zamiast formularza, token nie trafia do pola, adres wyczyszczony', () => {
    for (const action of [null, '']) {
      const request = run({ ids: REQUEST_IDS, action });
      expect(request['delete-submit'].disabled).toBe(true);
      expect(request['delete-form'].hidden).toBe(true);
      expect(request['delete-unavailable'].hidden).toBe(false);

      const confirm = run({ ids: CONFIRM_IDS, hash: `#${TOKEN}`, action });
      expect(confirm['delete-token'].value).toBe('');
      expect(confirm['delete-submit'].disabled).toBe(true);
      expect(confirm['delete-unavailable'].hidden).toBe(false);
      expect(confirm['delete-invalid'].hidden).toBe(true);
      expect(confirm.replaced).toHaveLength(1);
    }
  });
});
