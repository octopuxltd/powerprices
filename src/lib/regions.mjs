// The 14 grid supply point (GSP) groups Agile is priced by. Codes and the
// set of groups come from the Octopus API (/v1/industry/grid-supply-points/);
// the area names are the industry-standard ones (Elexon / MPAN distributor
// table). There is no I or O.

export const REGIONS = [
  { code: 'A', name: 'Eastern England' },
  { code: 'B', name: 'East Midlands' },
  { code: 'C', name: 'London' },
  { code: 'D', name: 'Merseyside and Northern Wales' },
  { code: 'E', name: 'West Midlands' },
  { code: 'F', name: 'North Eastern England' },
  { code: 'G', name: 'North Western England' },
  { code: 'H', name: 'Southern England' },
  { code: 'J', name: 'South Eastern England' },
  { code: 'K', name: 'Southern Wales' },
  { code: 'L', name: 'South Western England' },
  { code: 'M', name: 'Yorkshire' },
  { code: 'N', name: 'Southern Scotland' },
  { code: 'P', name: 'Northern Scotland' },
];

// URL scheme: London lives at the site root; every other region sits under
// its name as a slug ("/yorkshire/", "/south-western-england/2025/"). The
// single-letter form ("/m/") and the default region's name form ("/london/")
// both exist as instant redirects to the canonical page, so links shared
// before the scheme changed keep working.
export const DEFAULT_REGION = 'C';

for (const r of REGIONS) r.slug = r.name.toLowerCase().replace(/[^a-z]+/g, '-');

/** Canonical absolute path for a region + range page, e.g. "/", "/london/90-days/". */
export function pageHref(region, range) {
  const regionPart = region.code === DEFAULT_REGION ? '' : `${region.slug}/`;
  const rangePart = range.slug ? `${range.slug}/` : '';
  return `/${regionPart}${rangePart}`;
}

/** Other paths that should redirect to the canonical page. */
export function aliasHrefs(region, range) {
  const rangePart = range.slug ? `${range.slug}/` : '';
  const aliases = [`/${region.code.toLowerCase()}/${rangePart}`];
  if (region.code === DEFAULT_REGION) aliases.push(`/${region.slug}/${rangePart}`);
  return aliases;
}
