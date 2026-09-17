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

// Brighton's region lives at the site root; every other region sits under
// its lowercase letter, so existing URLs keep working.
export const DEFAULT_REGION = 'J';

/** Absolute URL path for a region + range page, e.g. "/", "/a/90-days/". */
export function pageHref(region, range) {
  const regionPart = region.code === DEFAULT_REGION ? '' : `${region.code.toLowerCase()}/`;
  const rangePart = range.slug ? `${range.slug}/` : '';
  return `/${regionPart}${rangePart}`;
}
