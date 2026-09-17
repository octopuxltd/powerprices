// Formatting helpers for user-facing copy. British conventions:
// 3-letter month abbreviations, "17 Sep 2026", pence with one decimal.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17 Sep 2026" from an ISO date string (YYYY-MM-DD). */
export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "17 Sep" from an ISO date string (no year). */
export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/**
 * "1 Jan to 17 Sep 2026" when both dates share a year, otherwise
 * "18 Sep 2025 to 17 Sep 2026". `wrap` decorates each date (e.g. a nowrap span).
 */
export function dateRange(fromIso, toIso, wrap = (s) => s) {
  const sameYear = fromIso.slice(0, 4) === toIso.slice(0, 4);
  const from = sameYear ? shortDate(fromIso) : longDate(fromIso);
  return `${wrap(from)} to ${wrap(longDate(toIso))}`;
}

/** "Sep" from an ISO date string. */
export function monthAbbr(iso) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

/** "17 Sep 2026, 14:00" for an instant, in UK local time. */
export function longDateTime(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  // Intl gives "Sept" for September in en-GB; the house style is 3 letters.
  const month = get('month').slice(0, 3);
  return `${get('day')} ${month} ${get('year')}, ${get('hour')}:${get('minute')}`;
}

/** "12.3p" (or "−1.2p" with a proper minus sign). */
export function pence(value, decimals = 1) {
  const abs = Math.abs(value).toFixed(decimals);
  return `${value < 0 ? '−' : ''}${abs}p`;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
