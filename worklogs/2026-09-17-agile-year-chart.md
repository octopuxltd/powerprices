# Agile year chart (powerprices.co.uk) — worklog
_Updated: 2026-09-17 16:30_
**Status:** complete

## Milestones (append-only)
- 2026-09-17 16:50 — dots are now exactly the column width (nested `<svg viewBox="0 0 2 2">` scaled to the column, so it stays fluid); range line and ticks at 30%; one y scale on every page (−20p to 100p today); store rewritten to final days only (fixes the daily-commit conflict).
- 2026-09-17 16:30 — marks redesigned: pink dot at the average (radius = old half bar width, floor 1.5px), single navy range line max→min with navy ticks at both ends, all at 50%; green dip overlay unchanged. Header and footer now full width (the `.measure` on them double-counted the gutter and made them narrower than everything else).
- 2026-09-17 16:10 — live at http://powerprices.co.uk. Repo `octopuxltd/powerprices` (public), GitHub Pages via Actions, daily build at 16:45 UTC commits `data/` back. Porkbun DNS: parking ALIAS + wildcard removed, 4 A + 4 AAAA at apex, `www` CNAME. HTTPS enforcement pending GitHub's certificate. Pill layer order pinned with `z-index` on `::view-transition-group()`.
- 2026-09-17 15:35 — key moved above the chart; explanatory sentences dropped from the lede; every switcher label got its own `view-transition-name` (inline, `range-label-*` / `region-label-*`) so the sliding pill's layer stacks below the labels. Layer order couldn't be probed in the preview pane (transitions abort with InvalidStateError there); follows from the spec's paint-order rule, needs Paul's eyes.
- 2026-09-17 15:20 — intro paragraph height fixed via a hidden ghost copy with the longest region name (grid-cell overlay, `.lede-box`), so the chart no longer jumps between regions; month labels centred in each month's span, with a fit rule that drops the year or the label when a span is too narrow (`monthLabel()` in `chart.mjs`).
- 2026-09-17 15:00 — switcher highlight moved to a `::before` layer so only the pill background slides between labels; plot's left axis line drawn on the sticky y-axis column (`.y-axis::after`, spans `--plot-top` to `--plot-bottom`).
- 2026-09-17 14:40 — incremental data store (`data/daily-<region>.json`, warm build ≈1s); JS in-place switcher kills the page flash; "Region code" label and region hover cards with headline figures; y-axis sticks while the chart scrolls.
- 2026-09-17 14:00 — region switcher (all 14 GSP regions, letters as pills) replaces the "Daily prices" heading; 30-day range removed; blue marks at 50% opacity. Build now writes 84 pages.
- 2026-09-17 13:25 — rise line (bar top to max) in dark blue; tooltip text vertically centred (equal 11px gaps, measured).
- 2026-09-17 13:10 — CSS-only styled tooltips on every bar (date, average, min/max, negative half-hour count); max marker in Octopus dark blue, bar and min marker in pink; key updated to four entries.
- 2026-09-17 12:50 — "All" restored; calendar-year pages now span the whole year with empty months; bars in Octopus pink; negative dips drawn as thick green lines; cross-document view transitions + chart anchor to stop the switch flicker.
- 2026-09-17 12:30 — switcher is now 30 days · 90 days · 1 year ‖ 2024 · 2025 · 2026 (calendar-year pages replace "All"); green negative-zone wash removed at Paul's request, min marker still turns green on negative days.
- 2026-09-17 12:10 — time-range switcher (30 days, 90 days, 1 year, all since Oct 2024) as four static pages; chart now fills the full page width with real-size type. Verified at 661px and 1600px.
- 2026-09-17 11:45 — first full build verified in the preview, light and dark, on http://localhost:8766. Palette validated with the dataviz checker (all pass, both modes).
- 2026-09-17 — project started; API facts confirmed (region J, product AGILE-24-10-01, unit rates endpoint is public).

## Goal
A static page for powerprices.co.uk showing a bar chart of Octopus Agile prices for the last 365 days, Brighton region. One bar per day = daily average price; upper and lower markers = that day's max and min half-hourly price. The negative-price zone below zero has a green background. Modern, minimalist design.

Done = `dist/index.html` renders correctly in the preview with real data, works with JS disabled, and the build can be re-run to refresh the data.

## Non-goals
- Other regions (only region J for now; the build takes a region param so it's cheap to add later).
- Live client-side fetching. The chart is built at build time.
- Hosting/deploy. Local static site only for now.

## Current state
Built and verified. `dist/index.html` has 365 day groups, each with a native `<title>` tooltip (date, average, min, max). Stat tiles: period average, cheapest and dearest half-hour with their date/time, count of negative-price half-hours and days. A `<details>` table lists every day. Page works with no JS. Served on http://localhost:8766.

Chart styling: average bar in blue, faint range line min→max, 2px horizontal markers at min and max, min marker turns green when the price is negative, green wash below the zero line.

## Decisions
- **No API key needed.** The unit-rates endpoint (`/v1/products/{product}/electricity-tariffs/{tariff}/standard-unit-rates/`) is public. Confirmed by curl with no auth. Paul's key is only needed for account data, which this page doesn't use. Rejected: storing the key in the build (needless secret).
- **Brighton = GSP group J.** Confirmed by `/v1/industry/grid-supply-points/?postcode=BN1`. Tariff code `E-1R-AGILE-24-10-01-J`.
- **Product AGILE-24-10-01** is the only current Agile import product (available from 2024-10-01, no end), so it covers the whole 365-day window.
- **Build-time rendering, not client-side fetching.** A Node build script fetches the year of half-hourly rates (12 paged requests), aggregates to daily min/avg/max and writes the SVG straight into `dist/index.html`. The page then needs no JS at all. Rejected: client-side fetch (12 API calls per visitor, blank page without JS, CORS risk). To refresh data, re-run the build (a daily scheduled build is the natural next step when it's hosted).
- **Prices shown inc. VAT** (`value_inc_vat`), because that's what a customer pays.
- **Days are Europe/London local days.** Half-hour slots are bucketed by the local date of `valid_from`, so BST/GMT and the 23/25-hour clock-change days come out right.
- **Time ranges are separate static pages, not a JS filter.** `/30-days/`, `/90-days/`, `/` (1 year), `/all/` (since the product launched, 1 Oct 2024), linked from a segmented control of plain links. One fetch of everything since launch feeds all four. Rejected: a JS range picker filtering a JSON file (needs JS for a core feature, blank without it); arbitrary custom date ranges (needs JS or a server; add later only if asked).
- **Chart x coordinates are percentages, y in pixels, y labels in an HTML column.** The chart fills the full page width and the axis text stays at 12px. Rejected: a viewBox (text scales with width: huge at 1600px, unreadable at 720px). Superseded the earlier viewBox version.
- **Chart section breaks out to full page width; text blocks keep a 72rem measure.** Done with a `.measure` class on the text sections rather than on `main`.
- **Switcher layout: 30 days · 90 days · 1 year · All ‖ 2024 · 2025 · 2026.** Years are derived from the product start year to the current year, so a new year appears on its own. Paul asked for All removed, then restored, so it stays.
- **Calendar-year pages span 1 Jan to 31 Dec** with `{ empty: true }` placeholder days where there's no data (before Oct 2024, after today). The chart skips those; stats and the table use data days only; the lede quotes the data range, not the calendar range.
- **Switch flicker: cross-document view transitions, not a JS page swap.** `@view-transition { navigation: auto }` crossfades the pages and the named chart section slides to its new spot; range links anchor to `#daily-prices` with `scroll-margin-top` so every switch lands with the chart at the top. Off under `prefers-reduced-motion`. Rejected: fetching the other page and swapping `<main>` with JS (needs JS for a core interaction and reflows just as much); a single page with all seven charts toggled by `:target` (about 1.3MB HTML, awkward default state, hash-scroll jumps). Firefox without cross-document view transitions just navigates as before.
- **Bars are Octopus brand pink `#f050f8`**, read from octopus.energy's own CSS custom properties (their light-surface text step is `#9a30b2`, lighter tint `#fa98ff`). Same hex in light and dark. Validator: light contrast 2.84:1 (WARN, relief is the table view and the tooltips); dark lightness band FAIL at L 0.71, accepted because it's the brand colour Paul asked for and it's how Octopus themselves use it on dark. Green vs pink separation is wide (ΔE 26 CVD).
- **Negative days: green wash removed; the dip below zero is redrawn as a 2.5px green line** with a 3px green min marker. Paul first asked for the wash to go, then for the green lines to be thicker.
- **Tooltips are built into the SVG at build time and shown with `:hover`, no JS.** Each day's tooltip is a nested `<svg x="N%">` so its box and text use pixel coordinates around the day's centre; anchored left/centre/right by position so it never spills out. The hover layer (hit rect + tooltip) is a separate group *after* all the marks, because SVG paints in document order and a tooltip inside a day's own group would sit under the next day's bars. Native `<title>` tooltips were dropped (they'd double up). Rejected: a single HTML tooltip positioned by JS (the no-JS rule; the native fallback would have been worse than what CSS gives). Tooltip line 4 is the count of negative half-hours that day, from the new `negative` field in `aggregate.mjs`.
- **Max marker is Octopus dark blue `#180048`** (their site's dominant navy is `#100030`; `#180048` is the step above it). On dark surfaces navy is invisible, so dark mode uses their lavender step `#a49fc8`. Bar and min marker stay pink.
- **Region switcher: 14 GSP letters as pills, name in `title` and `aria-label`.** Full names (14 × "South Eastern England") don't fit a segmented control; letters do, on one row from about 900px. Region codes confirmed from `/v1/industry/grid-supply-points/` (A–H, J–N, P). Octopus's docs don't name the regions, so names are the Elexon/MPAN distributor-table names (checked on the Wikipedia MPAN page). Rejected: a `<select>` (needs JS or a submit button to navigate), a dropdown menu (not "similar to the date switcher").
- **URL scheme: region J stays at the root, others under their lowercase letter** (`/a/`, `/a/90-days/`, `/a/2025/`). Keeps every existing URL working. Region links keep the current range; range links keep the current region.
- **Build fetches four regions at a time** (`pool()` in `build.mjs`), about a minute for all 14. Each region is ~24 paged requests to the one host, so a small pool rather than all 14 at once.
- **30-day range removed** at Paul's request; `/30-days/` folder deleted from `dist/`.
- **Store daily summaries, not raw half-hours.** `data/daily-<region>.json` holds every day since Oct 2024 (min, minAt, avg, max, maxAt, slots, negative). Headline stats are computed from days alone (cheapest = day with lowest min, at its `minAt`), so raw slots never need keeping. ~150KB per region vs ~1.4MB for raw slots. A day is final when it's before today and its slot count matches the expected 46/48/50; the build fetches from the first non-final day. `format: 2` in the file; a different format is ignored and refetched. Rejected: caching raw slots (14× the size for nothing the page uses).
- **In-place switching is a JS enhancement on top of real links** (`src/switcher.js`): fetch the target page, swap `<main>` and `<title>`, `pushState`, `startViewTransition` where available; popstate re-fetches. Links keep the `#daily-prices` anchor for the no-JS path; the script strips it from the recorded URL. This is the one place the site uses client-side JS, justified because the CSS-only route was tried and failed (see Dead ends).
- **Region hover cards** are HTML `<span class="tip">` inside each pill, shown on `:hover` and `:focus-visible`, with the region name and the same four figures as the stat tiles, for the current range. Needs every region's stats before any page renders, hence the two-phase build. First/last three pills anchor the card to their edge so it can't run off screen.
- **Sticky y-axis**: `.y-axis` is `position: sticky; left: 0` inside the horizontal scroller, with the surface colour as background.
- **Hosting: GitHub Pages + Actions, repo public.** Free-plan Pages needs a public repo; the code and data are public anyway. Cron at 16:45 UTC (always after 16:00 UK in both GMT and BST). The workflow commits `data/` with GITHUB_TOKEN, which can't trigger another run, so no loop. `dist/CNAME` is written by the build because Pages reads the custom domain from the artifact. Rejected: Cloudflare Pages (no scheduler of its own; second vendor for nothing).
- **Switcher pill stacking during a transition** is pinned with `::view-transition-group(*) { z-index: 1 }` and the two pill groups at 0. Paint-order stacking alone put the pill above labels when moving one way and below the other (Paul saw it flip by direction).
- **The store holds final days only and no timestamp**, so any build anywhere writes byte-identical files. Learned the hard way: the first local commit after the bot's daily data commit conflicted in all 14 JSON files, because both sides had rewritten `generated` and today's partial day. Today is refetched on every build instead (one day per region, trivial).
- **One y scale for every page**: the build finds the lowest and highest price across all regions and all days and passes it to `renderChart` as `extent`. A 90-day page with a quiet range no longer looks dramatic. Paul's ask: "always go up to the highest point any data reaches".
- **Min width for the scroll container scales with the day count** (`max(720px, days × 2px)`), so the 717-day page stays legible on a phone by scrolling.

## Dead ends
- **Cross-document view transitions alone did not stop the switch flash.** `@view-transition { navigation: auto }` parsed and was present on both pages, yet Paul still saw a full flash on every region or range change. Probably his browser doesn't do cross-document transitions, or paint-holding doesn't cover this case; either way it can't be relied on. The rule stays in `style.css` as a harmless no-JS nicety, but the fix is the JS in-place swap in `switcher.js`.

## Ground truth
- `src/build.mjs` — orchestrates fetch, aggregate, render.
- `src/lib/octopus.mjs` — paginated fetch of unit rates.
- `src/lib/aggregate.mjs` — daily min/avg/max in Europe/London.
- `src/lib/chart.mjs` — SVG renderer.
- `src/template.html`, `src/style.css` — page shell.
- `dist/` — output, served on the port in `/Users/paul.annett/schemes/PORTS.md`.
- Build: `cd /Users/paul.annett/schemes/powerprices && node src/build.mjs`

## Gotchas
- SVG `<text>` positions by baseline, so stacking lines at `y = pad + line × n` leaves a big gap above and none below. The tooltips set `dominant-baseline: central` and put `y` at each row's centre. Measure top and bottom gaps with `getBBox()` rather than trusting the padding maths.
- Octopus API `page_size` maxes at 1500; results come newest-first. Follow `next` links.
- Agile publishes each day's prices for 23:00 to 23:00 UK time, so today's last two half-hours (23:00 to 00:00) only appear around 16:00. A build earlier in the day sees 46 slots for today; the day's figures are over what's published so far. Clock-change days have 46 and 50 slots.
- `Intl` en-GB gives "Sept" for September; `format.mjs` trims month names to 3 letters.
- The preview pane is narrower than the chart's 720px minimum, so the chart scrolls sideways there. That's intended for phones, not a bug.

## Open questions
None open.
- **Other regions.** The build takes a region argument, but the page only shows one. If powerprices.co.uk should cover the whole country, the template needs a region picker (one page per region, static links, same pattern as the range switcher). Not started.

## Next step
None — complete. Optional follow-ups: scheduled rebuild once hosted; favicon and social image; region picker.
