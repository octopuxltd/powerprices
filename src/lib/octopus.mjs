// Fetches half-hourly Agile unit rates from the Octopus Energy API.
// This endpoint is public: no API key is needed for product/tariff data.

const API = 'https://api.octopus.energy/v1';

export const PRODUCT = 'AGILE-24-10-01';

export function tariffCode(region) {
  return `E-1R-${PRODUCT}-${region}`;
}

/**
 * Returns every half-hour slot in [from, to) as
 * { from: Date, to: Date, incVat: number, excVat: number }, oldest first.
 */
export async function fetchUnitRates(region, from, to) {
  const base = `${API}/products/${PRODUCT}/electricity-tariffs/${tariffCode(region)}/standard-unit-rates/`;
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    page_size: '1500', // API maximum; a year is ~12 pages
  });

  let url = `${base}?${params}`;
  const slots = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Octopus API ${res.status} for ${url}`);
    const body = await res.json();
    for (const r of body.results) {
      slots.push({
        from: new Date(r.valid_from),
        to: new Date(r.valid_to),
        incVat: r.value_inc_vat,
        excVat: r.value_exc_vat,
      });
    }
    url = body.next;
  }

  // API returns newest first; callers want chronological order.
  slots.sort((a, b) => a.from - b.from);
  return slots;
}
