# powerprices.co.uk

Octopus Agile electricity prices, day by day, for every UK region. One bar per day (the average), with markers for the day's cheapest and dearest half-hour.

Static site: a Node script fetches the prices from the public Octopus Energy API, keeps a daily summary per region in `data/`, and writes finished HTML to `dist/`. A GitHub Actions workflow rebuilds it every day and publishes it to GitHub Pages.

## Build locally

```bash
node src/build.mjs
```

Optionally pass one region letter (A to P) to build just that region.

## Layout

- `src/build.mjs` builds the site; `src/lib/` holds the fetcher, store, aggregator, chart renderer and formatters.
- `src/template.html`, `src/style.css`, `src/switcher.js` are the page shell.
- `data/daily-<region>.json` is the store: every day's summary since 1 Oct 2024. Committed, updated by the daily build.
- `dist/` is the output (not committed).

See `CLAUDE.md` for the working notes.
