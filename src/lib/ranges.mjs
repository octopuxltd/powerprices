// The time ranges the site offers. Each becomes its own static page, so
// switching range is a plain link and works without JavaScript.
//
// Two groups, shown either side of a divider in the switcher:
//   rolling windows ending today (90 days, 1 year, all)
//   calendar years, from the product's launch year to the current year

export const PRODUCT_START = '2024-10-01'; // AGILE-24-10-01 available_from

const ROLLING = [
  { slug: '90-days', label: 'Last 90 days', title: 'last 90 days', kind: 'rolling', days: 90 },
  { slug: '', label: '365 days', title: 'last 365 days', kind: 'rolling', days: 365 }, // the home page
  { slug: 'all', label: 'All time', title: 'since Oct 2024', kind: 'all' },
];

/** @param {string} todayIso YYYY-MM-DD */
export function rangeGroups(todayIso) {
  const firstYear = Number(PRODUCT_START.slice(0, 4));
  const thisYear = Number(todayIso.slice(0, 4));
  const years = [];
  for (let y = firstYear; y <= thisYear; y += 1) {
    years.push({ slug: String(y), label: String(y), title: `in ${y}`, kind: 'year', year: y });
  }
  return [ROLLING, years];
}

/**
 * The days a range covers, oldest first. A calendar year always runs
 * 1 Jan to 31 Dec: dates with no data come back as { date, empty: true }
 * so the chart keeps the year's full width and shows the gaps as gaps.
 */
export function selectDays(range, allDays) {
  if (range.kind === 'all') return allDays;
  if (range.kind === 'rolling') return allDays.slice(-range.days);

  const byDate = new Map(allDays.map((d) => [d.date, d]));
  const days = [];
  const cursor = new Date(Date.UTC(range.year, 0, 1));
  while (cursor.getUTCFullYear() === range.year) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push(byDate.get(iso) ?? { date: iso, empty: true });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
