// Buckets half-hourly slots into Europe/London calendar days and
// reduces each day to min / average / max price.

const LONDON_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO date (YYYY-MM-DD) of an instant, in UK local time. */
export function londonDate(date) {
  return LONDON_DAY.format(date); // en-CA gives YYYY-MM-DD
}

/** Midnight UK time on a given ISO date, as a UTC instant. */
export function londonMidnight(iso) {
  // Try the UTC midnight, then nudge until the London date matches; handles BST.
  const t = new Date(`${iso}T00:00:00Z`).getTime();
  for (const offsetHours of [0, -1, 1]) {
    const candidate = new Date(t + offsetHours * 3600e3);
    if (londonDate(candidate) === iso && londonDate(new Date(candidate.getTime() - 1)) !== iso) {
      return candidate;
    }
  }
  return new Date(t);
}

/** ISO date n days after (or before, if negative) another ISO date. */
export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** How many half-hours a UK day has: 48, or 46 / 50 on clock-change days. */
export function expectedSlots(iso) {
  const start = londonMidnight(iso).getTime();
  const end = londonMidnight(addDays(iso, 1)).getTime();
  return Math.round((end - start) / (30 * 60e3));
}

/**
 * @param {Array<{from: Date, incVat: number}>} slots chronological half-hours
 * @returns {Array<{date: string, min: number, minAt: string, avg: number, max: number, maxAt: string, slots: number, negative: number}>}
 */
export function dailySummary(slots) {
  const byDay = new Map();
  for (const s of slots) {
    const key = londonDate(s.from);
    let d = byDay.get(key);
    if (!d) {
      d = { date: key, min: Infinity, minAt: null, max: -Infinity, maxAt: null, sum: 0, slots: 0, negative: 0 };
      byDay.set(key, d);
    }
    if (s.incVat < d.min) {
      d.min = s.incVat;
      d.minAt = s.from.toISOString();
    }
    if (s.incVat > d.max) {
      d.max = s.incVat;
      d.maxAt = s.from.toISOString();
    }
    d.sum += s.incVat;
    d.slots += 1;
    if (s.incVat < 0) d.negative += 1;
  }

  return [...byDay.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(({ date, min, minAt, max, maxAt, sum, slots, negative }) => ({
      date,
      min,
      minAt, // ISO instant of the cheapest half-hour
      avg: sum / slots,
      max,
      maxAt, // ISO instant of the dearest half-hour
      slots, // 48 normally; 46 or 50 on clock-change days
      negative, // half-hours priced below zero
    }));
}

/** Headline figures across a set of days. Works from the daily summaries alone. */
export function periodStats(days) {
  const avg = days.reduce((t, d) => t + d.avg, 0) / days.length;
  const cheapestDay = days.reduce((a, b) => (b.min < a.min ? b : a));
  const dearestDay = days.reduce((a, b) => (b.max > a.max ? b : a));
  return {
    avg,
    cheapest: { incVat: cheapestDay.min, from: new Date(cheapestDay.minAt) },
    dearest: { incVat: dearestDay.max, from: new Date(dearestDay.maxAt) },
    negativeSlots: days.reduce((t, d) => t + d.negative, 0),
    negativeDays: days.filter((d) => d.negative > 0).length,
  };
}
