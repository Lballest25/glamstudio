// Accent- and case-insensitive search helpers. Postgres `ilike` ignores case
// but not accents ("maria" would not find "María"), so client search is done
// here on normalized text instead.

// Lowercases and strips diacritics: María → maria, Peña → pena, Núñez → nunez.
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Every word typed must appear in the name, in any order, so
// "lopez maria" finds "María Fernanda López". A query with 3+ digits also
// matches the phone number.
export function matchesPerson(fullName: string, phone: string | null | undefined, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;

  const name = normalizeText(fullName);
  if (q.split(' ').every((word) => name.includes(word))) return true;

  const digits = query.replace(/\D/g, '');
  return digits.length >= 3 && (phone ?? '').replace(/\D/g, '').includes(digits);
}
