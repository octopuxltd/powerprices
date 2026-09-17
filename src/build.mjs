// Build: fetch Agile rates for every region, summarise per day, and render one
// static page per region × time range into dist/.
// Usage: node src/build.mjs            (all regions)
//        node src/build.mjs J          (one region, for a quick check)

import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { fetchUnitRates, tariffCode } from './lib/octopus.mjs';
import { dailySummary, periodStats, londonDate, londonMidnight, addDays } from './lib/aggregate.mjs';
import { loadDays, saveDays, firstDayToFetch, mergeDays } from './lib/store.mjs';
import { renderChart } from './lib/chart.mjs';
import { longDate, longDateTime, pence, escapeHtml } from './lib/format.mjs';
import { PRODUCT_START, rangeGroups, selectDays } from './lib/ranges.mjs';
import { REGIONS, pageHref, aliasHrefs } from './lib/regions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data');

// How many regions to fetch at once. A cold build is ~24 paged requests per
// region to the same host, so a small pool keeps it quick without hammering
// the API. Warm builds only fetch a day or two per region.
const FETCH_CONCURRENCY = 4;

const onlyRegion = process.argv[2]?.toUpperCase();
const regionsToBuild = onlyRegion ? REGIONS.filter((r) => r.code === onlyRegion) : REGIONS;
if (regionsToBuild.length === 0) throw new Error(`Unknown region "${process.argv[2]}"`);

/** Run `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const now = new Date();
  const todayIso = londonDate(now);
  const to = londonMidnight(addDays(todayIso, 1)); // start of tomorrow

  const template = await readFile(path.join(SRC, 'template.html'), 'utf8');
  await mkdir(DIST, { recursive: true });
  await copyFile(path.join(SRC, 'style.css'), path.join(DIST, 'style.css'));
  await copyFile(path.join(SRC, 'switcher.js'), path.join(DIST, 'switcher.js'));
  // GitHub Pages reads the custom domain from a CNAME file in the deployed artifact.
  await writeFile(path.join(DIST, 'CNAME'), 'powerprices.co.uk\n');

  const groups = rangeGroups(todayIso);

  // Phase 1: bring every region's stored daily summaries up to date, fetching
  // only the days that aren't final yet. All regions are needed before any
  // page renders, because each page's region tooltips show the other regions'
  // headline figures for the same range.
  console.log(`Updating ${regionsToBuild.length} region(s) to ${todayIso}…`);
  const summaries = await pool(regionsToBuild, FETCH_CONCURRENCY, async (region) => {
    const stored = await loadDays(DATA, region.code);
    const fromIso = firstDayToFetch(stored, PRODUCT_START, todayIso);
    const fresh = dailySummary(await fetchUnitRates(region.code, londonMidnight(fromIso), to))
      .filter((d) => d.date >= fromIso && d.date <= todayIso);
    const allDays = mergeDays(stored, fresh, fromIso);
    console.log(`  ${region.code} ${region.name}: fetched ${fresh.length} day(s) from ${fromIso}, ${allDays.length} days stored`);

    await saveDays(DATA, region.code, tariffCode(region.code), allDays, todayIso);

    const byRange = new Map();
    for (const range of groups.flat()) {
      const days = selectDays(range, allDays); // may include empty placeholder days (calendar years)
      const dataDays = days.filter((d) => !d.empty);
      byRange.set(range, {
        days,
        dataDays,
        startIso: dataDays[0].date,
        endIso: dataDays.at(-1).date,
        stats: periodStats(dataDays),
      });
    }
    return { region, byRange };
  });

  // Every chart shares one y scale, spanning the lowest and highest price in
  // the whole dataset (all regions, all days), so a quiet 90 days isn't
  // stretched to look dramatic, and a new record high moves every axis at once.
  const allDataDays = summaries.flatMap((s) => s.byRange.get(groups.flat().find((r) => r.kind === 'all')).dataDays);
  const extent = {
    min: Math.min(...allDataDays.map((d) => d.min)),
    max: Math.max(...allDataDays.map((d) => d.max)),
  };
  console.log(`Y axis covers ${pence(extent.min)} to ${pence(extent.max)} on every page`);

  // Phase 2: render one page per region × range, plus a redirect stub at each
  // alias path (GitHub Pages can't do server-side redirects).
  const redirect = await readFile(path.join(SRC, 'redirect.html'), 'utf8');
  let stubs = 0;
  for (const { region, byRange } of summaries) {
    for (const range of groups.flat()) {
      const regionStats = new Map(summaries.map((s) => [s.region.code, s.byRange.get(range)]));
      const html = renderPage({ template, groups, region, range, ...byRange.get(range), regionStats, extent, now });

      const href = pageHref(region, range);
      const dir = path.join(DIST, href);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html);

      for (const alias of aliasHrefs(region, range)) {
        const aliasDir = path.join(DIST, alias);
        await mkdir(aliasDir, { recursive: true });
        await writeFile(path.join(aliasDir, 'index.html'), fill(redirect, { target: href }));
        stubs += 1;
      }
    }
  }

  console.log(`Wrote ${regionsToBuild.length * groups.flat().length} pages and ${stubs} redirects to ${path.relative(ROOT, DIST)}/`);
}

function renderPage({ template, groups, region, range, days, dataDays, startIso, endIso, stats, regionStats, extent, now }) {
  // Both switchers anchor to the chart so a switch lands with the chart in
  // view rather than at the page top.
  const regionNav = REGIONS.map((r) => {
    const current = r === region ? ' aria-current="page"' : '';
    // Each label gets its own view-transition name so it keeps its own layer
    // during a switch and the sliding pill passes behind it, not over it.
    return (
      `<a href="${pageHref(r, range)}#daily-prices"${current} ` +
      `aria-label="${escapeHtml(r.name)} (region ${r.code})">` +
      `<span class="label" style="view-transition-name:region-label-${r.code}">${r.code}</span>` +
      regionTooltip(r, regionStats.get(r.code)) +
      `</a>`
    );
  }).join('');

  const rangeNav = groups
    .map((group) =>
      group
        .map((r) => {
          const current = r === range ? ' aria-current="page"' : '';
          return (
            `<a href="${pageHref(region, r)}#daily-prices"${current}>` +
            `<span class="label" style="view-transition-name:range-label-${r.slug || 'year'}">${r.label}</span></a>`
          );
        })
        .join(''),
    )
    .join('<span class="divider" role="separator"></span>');

  const statsHtml = [
    tile('Average price', pence(stats.avg), `across ${dataDays.length} days`),
    tile('Cheapest half-hour', pence(stats.cheapest.incVat), longDateTime(stats.cheapest.from)),
    tile('Hours of negative pricing', hours(stats.negativeSlots), `${stats.negativeSlots} half-hour ${stats.negativeSlots === 1 ? 'slot' : 'slots'}`),
    tile(
      'Days with a negative period',
      String(stats.negativeDays),
      `of ${dataDays.length} days (${Math.round((stats.negativeDays / dataDays.length) * 100)}% of days)`,
    ),
  ].join('\n');

  const tableRows = dataDays
    .map(
      (d) =>
        `<tr><td>${longDate(d.date)}</td>` +
        `<td${d.min < 0 ? ' class="negative"' : ''}>${pence(d.min)}</td>` +
        `<td>${pence(d.avg)}</td><td>${pence(d.max)}</td></tr>`,
    )
    .join('\n');

  // The ghost copy uses the longest region name and the widest date strings so
  // the intro block is the same height for every region and range.
  const longestRegion = REGIONS.reduce((a, b) => (b.name.length > a.name.length ? b : a));

  return fill(template, {
    buildId: now.getTime().toString(36),
    rangeTitle: range.title,
    rangeNav,
    regionNav,
    regionName: escapeHtml(region.name),
    lede: ledeText(region, longDate(startIso), longDate(endIso)),
    ledeGhost: ledeText(longestRegion, '28 Sep 2026', '28 Sep 2026'),
    stats: statsHtml,
    // Calendar years always get month labels, even the short first one (Oct to Dec 2024).
    chart: renderChart(days, { xLabels: range.kind === 'year' ? 'month' : undefined, extent }),
    tableRows,
    tariff: tariffCode(region.code),
    updatedIso: now.toISOString(),
    updated: longDateTime(now),
  });
}

/** Half-hour slot count as hours: 421 → "210.5". */
function hours(slots) {
  return String(slots / 2);
}

function ledeText(region, fromDate, toDate) {
  return `Half-hourly electricity prices for ${escapeHtml(region.name)} (region ${region.code}), ${fromDate} to ${toDate}.`;
}

/**
 * Hover card for a region pill: the region's name and, when the build has
 * that region's data, the same headline figures the stat tiles show, for the
 * current range. Shown by `.regions a:hover .tip` in style.css.
 */
function regionTooltip(region, summary) {
  const lines = [`<span class="tip-name">${escapeHtml(region.name)} (region ${region.code})</span>`];
  if (summary) {
    const { stats, dataDays } = summary;
    const negDays = `${stats.negativeDays} ${stats.negativeDays === 1 ? 'day' : 'days'}`;
    lines.push(
      `<span>Average ${pence(stats.avg)} across ${dataDays.length} days</span>`,
      `<span>Cheapest ${pence(stats.cheapest.incVat)} · ${longDateTime(stats.cheapest.from)}</span>`,
      `<span${stats.negativeSlots ? ' class="tip-neg"' : ''}>${hours(stats.negativeSlots)} hours of negative pricing on ${negDays}</span>`,
    );
  }
  return `<span class="tip" aria-hidden="true">${lines.join('')}</span>`;
}

function tile(label, value, detail) {
  return (
    `<div class="stat"><p class="label">${escapeHtml(label)}</p>` +
    `<p class="value">${escapeHtml(value)}</p>` +
    `<p class="detail">${escapeHtml(detail)}</p></div>`
  );
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Template placeholder {{${key}}} has no value`);
    return values[key];
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
