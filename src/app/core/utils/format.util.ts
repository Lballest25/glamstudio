const LOCALE = 'es-CO';

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true });
const dayLongFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const dayMonthFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });
const dateMediumFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const monthYearFmt = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const weekdayShortFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short' });

export type DateInput = string | Date;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function stripDot(value: string): string {
  return value.replace(/\.$/, '');
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// `toISOString().slice(0, 10)` returns the UTC date, which is already
// "tomorrow" after 7 p.m. in Colombia (UTC-5) — always use local parts.
export function toLocalISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(value: DateInput): string {
  return timeFmt.format(toDate(value));
}

export function formatDayLong(value: DateInput): string {
  return capitalize(dayLongFmt.format(toDate(value)));
}

export function formatDayMonth(value: DateInput): string {
  return dayMonthFmt.format(toDate(value));
}

export function formatDateMedium(value: DateInput): string {
  return dateMediumFmt.format(toDate(value));
}

export function formatMonthYear(value: DateInput): string {
  return capitalize(monthYearFmt.format(toDate(value)));
}

export function formatWeekdayShort(value: DateInput): string {
  return capitalize(stripDot(weekdayShortFmt.format(toDate(value))));
}

export function formatMonthShort(value: DateInput): string {
  return stripDot(monthShortFmt.format(toDate(value)));
}

export function relativeDayLabel(value: DateInput): string {
  const date = toDate(value);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (isSameDay(date, today)) return `Hoy, ${formatDayMonth(date)}`;
  if (isSameDay(date, tomorrow)) return `Mañana, ${formatDayMonth(date)}`;
  return formatDayLong(date);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const AVATAR_PALETTE: [string, string][] = [
  ['#f3ecfa', '#6a4793'],
  ['#fdeef3', '#a8436a'],
  ['#e7f0fa', '#2f64a3'],
  ['#e2f4ea', '#1f7a50'],
  ['#fdf1dc', '#8f5e12'],
  ['#eef0fb', '#4a55a8'],
  ['#fbe9e9', '#a83838'],
];

export function avatarColors(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  return { bg, fg };
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
