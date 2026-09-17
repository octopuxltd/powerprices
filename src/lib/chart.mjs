// Renders the daily price chart as inline HTML + SVG.
// One bar per day (average), a thin range line from min to max, and
// short horizontal markers at the min and max. A min marker below 0p is
// drawn green. Colours come from CSS custom properties in style.css
// so the SVG follows the page's light/dark theme.
//
// Why percentages for x and pixels for y: the chart has to fill whatever
// width the page gives it. A viewBox would scale the axis text along with
// the bars (huge on wide screens, unreadable on narrow ones). With x as a
// percentage of the SVG width and a fixed pixel height, the bars stretch and
// the type stays at its real size. The y labels live in an HTML column
// beside the SVG for the same reason.

import { longDate, monthAbbr, pence } from './format.mjs';

const H = 480;
const PAD = { top: 12, bottom: 28 };

/** Round the domain out to a clean tick step. */
function niceStep(range) {
  const rough = range / 6;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  return candidates.find((c) => c >= rough) ?? candidates.at(-1);
}

const pct = (n) => `${Number(n.toFixed(4))}%`;
const px = (n) => Number(n.toFixed(2));

/** Day of week for an ISO date, 0 = Sunday. Dates are calendar days, so UTC is fine. */
function weekday(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/**
 * @param {Array} days daily summaries, oldest first
 * @param {{xLabels?: 'week' | 'month'}} [options] x-axis labelling; defaults to weekly for short ranges
 */
export function renderChart(days, { xLabels } = {}) {
  const plotH = H - PAD.top - PAD.bottom;
  const n = days.length;

  // Calendar-year pages pad the list with { empty: true } placeholders so the
  // axis spans the whole year; those days have no marks.
  const dataDays = days.filter((d) => !d.empty);
  const dataMin = Math.min(0, ...dataDays.map((d) => d.min));
  const dataMax = Math.max(...dataDays.map((d) => d.max));
  const step = niceStep(dataMax - dataMin);
  const yMin = Math.floor(dataMin / step) * step;
  const yMax = Math.ceil(dataMax / step) * step;

  const y = (v) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;
  const slot = 100 / n; // percent of width per day
  const x = (i) => i * slot;
  // Bars take just over half the slot; markers a little wider so they read as
  // a cap. Both are capped so short ranges don't produce slab-like bars.
  const barW = Math.min(slot * 0.55, 1.6);
  const tickW = Math.min(slot * 0.8, barW + 0.5);

  const svg = [];
  const yLabels = [];

  // Horizontal gridlines; labels go in the HTML column.
  for (let v = yMin; v <= yMax; v += step) {
    const yy = px(y(v));
    const cls = v === 0 ? 'grid baseline' : 'grid';
    svg.push(`<line class="${cls}" x1="0" x2="100%" y1="${yy}" y2="${yy}"/>`);
    yLabels.push(`<span style="top:${yy}px">${pence(v, 0)}</span>`);
  }

  // X axis: a gridline at each month start, and labels centred in each
  // month's span (months, or Mondays for short ranges).
  const weekly = xLabels ? xLabels === 'week' : n <= 100;
  const labelY = H - 8;

  days.forEach((d, i) => {
    if (d.date.slice(8) !== '01') return;
    const xx = pct(x(i));
    svg.push(`<line class="grid month" x1="${xx}" x2="${xx}" y1="${PAD.top}" y2="${PAD.top + plotH}"/>`);
  });

  if (weekly) {
    days.forEach((d, i) => {
      if (weekday(d.date) !== 1) return;
      const label = `${Number(d.date.slice(8))} ${monthAbbr(d.date)}`;
      svg.push(`<text class="axis x" x="${pct(x(i) + slot / 2)}" y="${labelY}" text-anchor="middle">${label}</text>`);
    });
  } else {
    for (const m of monthSpans(days)) {
      const centre = x(m.start) + ((m.end - m.start + 1) * slot) / 2;
      const label = monthLabel(m, n);
      if (label) svg.push(`<text class="axis x" x="${pct(centre)}" y="${labelY}" text-anchor="middle">${label}</text>`);
    }
  }

  // Marks for every day: range line, average bar, min/max markers.
  const marks = [];
  // Hover layer, one group per day: a full-height hit area plus its tooltip.
  // Kept as a separate layer *after* the marks so a tooltip paints above the
  // bars of neighbouring days (SVG has no z-index; document order decides).
  const hover = [];

  days.forEach((d, i) => {
    if (d.empty) return;
    const cx = x(i) + slot / 2;
    const y0 = y(0);
    const yAvg = y(d.avg);
    const barTop = Math.min(y0, yAvg);
    const barH = Math.abs(y0 - yAvg);

    marks.push(
      `<g class="day-marks${d.min < 0 ? ' has-negative' : ''}">` +
        // Above the bar: the rise to the day's max, in the max colour.
        `<line class="rise" x1="${pct(cx)}" x2="${pct(cx)}" y1="${px(y(d.max))}" y2="${px(yAvg)}"/>` +
        // Below the bar: the fall to the day's min, faint in the bar colour.
        `<line class="range" x1="${pct(cx)}" x2="${pct(cx)}" y1="${px(yAvg)}" y2="${px(y(d.min))}"/>` +
        // The dip below zero is drawn again in solid green so negative days stand out.
        (d.min < 0 ? `<line class="dip" x1="${pct(cx)}" x2="${pct(cx)}" y1="${px(y0)}" y2="${px(y(d.min))}"/>` : '') +
        `<rect class="avg" x="${pct(cx - barW / 2)}" y="${px(barTop)}" width="${pct(barW)}" height="${px(barH)}"/>` +
        `<line class="marker max" x1="${pct(cx - tickW / 2)}" x2="${pct(cx + tickW / 2)}" y1="${px(y(d.max))}" y2="${px(y(d.max))}"/>` +
        `<line class="marker min" x1="${pct(cx - tickW / 2)}" x2="${pct(cx + tickW / 2)}" y1="${px(y(d.min))}" y2="${px(y(d.min))}"/>` +
        `</g>`,
    );

    hover.push(
      `<g class="day" data-date="${d.date}">` +
        `<rect class="hit" x="${pct(x(i))}" y="${PAD.top}" width="${pct(slot)}" height="${plotH}"/>` +
        renderTooltip(d, cx) +
        `</g>`,
    );
  });
  svg.push(...marks, ...hover);

  return (
    `<div class="chart-wrap" style="--days:${n};--chart-h:${H}px;--plot-top:${PAD.top}px;--plot-bottom:${PAD.bottom}px">` +
    `<div class="y-axis" aria-hidden="true">${yLabels.join('')}</div>` +
    `<svg class="chart" role="img" ` +
    `aria-label="Daily Agile prices: average bar with minimum and maximum markers for each of ${n} days">` +
    svg.join('\n') +
    `</svg></div>`
  );
}

/** Contiguous runs of days in the same month: { month: 'YYYY-MM', start, end } (indexes, inclusive). */
function monthSpans(days) {
  const spans = [];
  days.forEach((d, i) => {
    const month = d.date.slice(0, 7);
    const last = spans.at(-1);
    if (last && last.month === month) last.end = i;
    else spans.push({ month, start: i, end: i });
  });
  return spans;
}

// Rough label widths as a share of the chart, assuming a ~1000px plot at 12px
// type (about 7px a character). A label may spill a little past its month's
// gridlines because its neighbours' labels are short and centred, but one
// much wider than its span is shortened (year dropped) or skipped.
const CHAR_SHARE = 0.7; // percent of width per character
const SPILL = 1.3; // a label may be up to this × its span

function monthLabel(span, n) {
  const room = (((span.end - span.start + 1) / n) * 100) * SPILL;
  const month = monthAbbr(`${span.month}-01`);
  const withYear = `${month} ${span.month.slice(0, 4)}`;
  const isJanuary = span.month.slice(5) === '01';
  if (isJanuary && withYear.length * CHAR_SHARE <= room) return withYear;
  if (month.length * CHAR_SHARE <= room) return month;
  return null;
}

const TIP_W = 176;
const TIP_LINE = 16;
const TIP_PAD = 10;

/**
 * A CSS-only tooltip: a nested <svg> takes a percentage x (the day's centre)
 * so its children can use plain pixel coordinates around that point. Shown by
 * `.day:hover .tip` in style.css. Anchored left, centre or right depending on
 * how close the day is to the chart edge, so it never spills outside.
 */
function renderTooltip(d, cx) {
  const lines = [
    { cls: 'tip-date', text: longDate(d.date) },
    { cls: 'tip-avg', text: `Average ${pence(d.avg)}` },
    { cls: '', text: `Min ${pence(d.min)} · Max ${pence(d.max)}` },
    { cls: d.negative ? 'tip-neg' : '', text: negativeLabel(d.negative) },
  ];
  const h = TIP_PAD * 2 + TIP_LINE * lines.length;
  const anchor = cx < 15 ? 'start' : cx > 85 ? 'end' : 'middle';
  const left = anchor === 'start' ? 6 : anchor === 'end' ? -TIP_W - 6 : -TIP_W / 2;

  // Each line's y is the centre of its row; style.css sets dominant-baseline
  // to central so the text block sits evenly inside the box.
  const text = lines
    .map((l, i) => `<text class="${l.cls}" x="${left + 12}" y="${TIP_PAD + TIP_LINE * (i + 0.5)}">${l.text}</text>`)
    .join('');

  return (
    `<svg class="tip" x="${pct(cx)}" y="${PAD.top + 8}" width="1" height="1" overflow="visible" aria-hidden="true">` +
    `<rect x="${left}" y="0" width="${TIP_W}" height="${h}" rx="6"/>` +
    text +
    `</svg>`
  );
}

function negativeLabel(count) {
  if (count === 0) return 'No negative half-hours';
  return `${count} negative half-hour${count === 1 ? '' : 's'}`;
}
