// The on-disk store of daily summaries, one JSON file per region in data/.
// Historical prices never change, so a build only fetches days that aren't
// final yet: today (its last two half-hours arrive around 16:00) and any day
// whose stored slot count is short because an earlier build ran before then.
// Commit data/ alongside the source: it is the site's database.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expectedSlots, addDays } from './aggregate.mjs';

// Bump when the per-day shape changes; older files are ignored and refetched.
const FORMAT = 2;

export async function loadDays(dataDir, regionCode) {
  try {
    const raw = JSON.parse(await readFile(path.join(dataDir, `daily-${regionCode}.json`), 'utf8'));
    return raw.format === FORMAT ? raw.days : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function saveDays(dataDir, regionCode, tariff, days, generated) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, `daily-${regionCode}.json`),
    JSON.stringify({ format: FORMAT, region: regionCode, tariff, generated, days }, null, 1),
  );
}

/** A day is final once it's in the past and every half-hour of it was seen. */
export function isFinal(day, todayIso) {
  return day.date < todayIso && day.slots === expectedSlots(day.date);
}

/**
 * The first date that still needs fetching: the day after the last final day
 * in an unbroken run from the product start, or the product start itself.
 */
export function firstDayToFetch(days, productStart, todayIso) {
  let cursor = productStart;
  const byDate = new Map(days.map((d) => [d.date, d]));
  while (byDate.has(cursor) && isFinal(byDate.get(cursor), todayIso)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** Stored final days before `fromIso`, followed by the freshly fetched ones. */
export function mergeDays(stored, fresh, fromIso) {
  return [...stored.filter((d) => d.date < fromIso), ...fresh];
}
