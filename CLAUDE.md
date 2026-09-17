# powerprices.co.uk

Static site showing Octopus Agile electricity prices. No framework. A Node build script fetches the data and writes finished HTML; the only client-side JS is `src/switcher.js`, a progressive enhancement that swaps page content in place when a region or range pill is clicked (the pills are ordinary links without it).

## Layout

- `src/build.mjs` builds the site. `src/lib/` holds the fetcher, aggregator, chart renderer and formatters. `src/template.html` and `src/style.css` are the page shell.
- `dist/` is the output. Never edit it by hand; rebuild instead. One static page per region × time range (14 × 6 = 84). Region J (Brighton) is at the root: `dist/index.html` (1 year), `dist/90-days/`, `dist/all/`, and one folder per calendar year (`dist/2024/` onwards, derived from the product start year to the current year). Every other region sits under its lowercase letter: `dist/a/`, `dist/a/90-days/`, `dist/a/2025/`. Ranges are in `src/lib/ranges.mjs`, regions in `src/lib/regions.mjs`. Both switchers are plain links using cross-document view transitions in `style.css` plus a `#daily-prices` anchor; don't add JS for them.
- Chart x coordinates are percentages and y coordinates are pixels, so the chart fills any width without scaling its text. Don't switch it to a viewBox.
- `data/daily-<region>.json` is the site's store: every *final* day's summary since Oct 2024, one file per region, no timestamps, so a build on any machine writes identical files and never conflicts with the daily bot commit. The build reads it first and fetches only what's missing (today, and any day whose slot count was short). Commit `data/` with the source. Delete a file to force a full refetch for that region. Logic in `src/lib/store.mjs`.
- Every chart shares one y scale: the extremes across all regions and all days, computed in `build.mjs` and passed to `renderChart` as `extent`. Don't let a page pick its own.
- Worklogs live in `worklogs/`.

## Build and preview

```bash
cd /Users/paul.annett/schemes/powerprices && node src/build.mjs
```

Builds all 14 regions. A warm build (store present) fetches one day per region and takes about a second; a cold build refetches everything and takes about a minute. Pass one region letter, e.g. `node src/build.mjs J`, to build just that region for a quick check (the other regions' tooltips then show names only).

`dist/` is served on http://localhost:8766 by the port LaunchAgent (see `/Users/paul.annett/schemes/PORTS.md`). `.claude/launch.json` attaches to it.

## Hosting

- Repo: https://github.com/octopuxltd/powerprices (public; GitHub Pages needs that on the free plan). Live at https://powerprices.co.uk via GitHub Pages with the Actions source.
- `.github/workflows/build.yml` runs on push to main, on demand, and daily at 16:45 UTC. It builds, commits any change to `data/` back to main, and deploys `dist/`. The build writes `dist/CNAME` for the custom domain.
- DNS is at Porkbun: four A and four AAAA records at the apex pointing at GitHub Pages, `www` CNAME to `octopuxltd.github.io`. The Porkbun API can edit them even though the dashboard's per-domain "API access" flag reads off.
- To force a deploy: `cd /Users/paul.annett/schemes/powerprices && gh workflow run build.yml`.

## Data facts

- The unit-rates endpoint is public; no API key is needed.
- Product `AGILE-24-10-01`, tariff `E-1R-AGILE-24-10-01-<region>`. Prices shown include VAT.
- Agile publishes each day's prices for 23:00 to 23:00 UK time, so today's last two half-hours arrive around 16:00. A build before then sees 46 slots for today.
