//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `src/agent/view.ts` (github.com/dmaretskyi/lighthouse, 1a137e8): the person's own filters and
// sort over a session's results, beside the agent's ranking. Filters never change a score.

/**
 * The person's own view of a session's results: filters that cut the list and a sort (SPEC: *Filters and sort*).
 * Next to the agent's rating model, these are the direct, predictable controls — a filter never changes a score,
 * the model still scores every result, and the sort defaults to that score.
 *
 * Filters are derived from the results' own properties (deriveFacets), so the panel fits any session: numbers
 * become ranges, short repeated texts become checkbox lists, flags become toggles, dates "in the last N days".
 * Pure functions with no node imports: the web UI, the API and the agent's tools share them.
 */
import { locationOf } from './location.ts';
import { type GeoArea, type Rateable, type RatingModel, type TermValue, readValue, signedDistanceM } from './rating.ts';

/** A number a range filter or a sort reads: one property, or a sum (rent + fees) as the rating model writes it. */
export type NumValue = { readonly prop: string } | { readonly sum: ReadonlyArray<string> };

/** What a toggle tests. `hasAny` and `located` are never unknown: lacking it is the answer. */
export type FlagTest =
  | { readonly has: string; readonly equals?: string | number }
  | { readonly match: string; readonly pattern: string }
  | { readonly hasAny: ReadonlyArray<string> }
  | { readonly located: true };

interface FilterBase {
  /** The facet's id (deriveFacets), so a saved filter finds its control again. */
  readonly id: string;
  readonly label: string;
  /**
   * Keep results whose value is unknown (default true). Unknown means the result lacks the value while results of
   * its kind have it (a listing whose amenities were not extracted); a result of a kind that never has it (a metro
   * station under a rent filter) is not applicable and is always left out.
   */
  readonly includeMissing?: boolean;
}

export type ViewFilter =
  | (FilterBase & { readonly kind: 'range'; readonly value: NumValue; readonly min?: number; readonly max?: number })
  /** Any of the values (or, with `all`, every one of them — amenities). Compared ignoring case and spaces. */
  | (FilterBase & {
      readonly kind: 'values';
      readonly prop: string;
      readonly values: ReadonlyArray<string>;
      readonly all?: boolean;
    })
  | (FilterBase & { readonly kind: 'flag'; readonly test: FlagTest })
  /** The date is within the last `days` days. */
  | (FilterBase & { readonly kind: 'date'; readonly prop: string; readonly days: number });

export type SortDir = 'asc' | 'desc';
export type ViewSort =
  | { readonly by: 'score' }
  | { readonly by: 'value'; readonly value: NumValue; readonly label?: string; readonly dir: SortDir }
  | { readonly by: 'date'; readonly prop: string; readonly label?: string; readonly dir: SortDir }
  /** Nearest to the person's drawn areas first (inside before outside). */
  | { readonly by: 'distance'; readonly label?: string };

/** Stored per session in results-view.json, beside rating-overrides.json. */
export interface ResultsView {
  readonly filters?: ReadonlyArray<ViewFilter>;
  readonly sort?: ViewSort;
  readonly updatedAt?: string;
}

// ── labels ───────────────────────────────────────────────────────────────────

/** Plain words for the properties sessions use most; anything else is its local name, spaced. */
const LABELS: Record<string, string> = {
  'rdf:type': 'Kind',
  'lh:monthlyPrice': 'Rent',
  'lh:adminFee': 'Admin fee',
  'lh:deposit': 'Deposit',
  'lh:areaM2': 'Area (m²)',
  'schema:numberOfRooms': 'Rooms',
  'lh:rooms': 'Rooms',
  'lh:floor': 'Floor',
  'lh:buildingFloors': 'Floors in building',
  'lh:buildYear': 'Year built',
  'lh:district': 'District',
  'lh:neighbourhood': 'Neighbourhood',
  'schema:addressLocality': 'Town',
  'lh:city': 'City',
  'lh:advertiserType': 'Advertiser',
  'lh:advertType': 'Advert type',
  'lh:amenity': 'Amenities',
  'lh:category': 'Category',
  'schema:datePosted': 'Posted',
  'schema:dateModified': 'Updated',
  'lh:bumpedAt': 'Bumped',
  'lh:availableFrom': 'Available from',
  'schema:ratingValue': 'Rating',
  'lh:ratingValue': 'Rating',
  'lh:rating': 'Rating',
  'schema:reviewCount': 'Reviews',
  'lh:reviewCount': 'Reviews',
  'lh:price': 'Price',
  'schema:price': 'Price',
  'lh:salePrice': 'Sale price',
  'lh:totalPrice': 'Total price',
  'schema:brand': 'Brand',
  'lh:brand': 'Brand',
  'schema:availability': 'Availability',
  'lh:sizeInStock': 'Sizes in stock',
  'lh:salaryMin': 'Salary from',
  'lh:salaryMax': 'Salary to',
  'lh:workMode': 'Work mode',
  'lh:seniority': 'Seniority',
  'lh:visualMatch': 'Looks like your image',
  'lh:site': 'Site',
  'lh:year': 'Year',
  'schema:startDate': 'Starts',
  'lh:mileageKm': 'Mileage (km)',
};

const humanize = (curie: string) => {
  const local = curie
    .replace(/^[a-z][a-z0-9]*:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
};

export const labelOf = (curie: string) => LABELS[curie] ?? humanize(curie);

/** A value as shown: a type's local name in words, an availability IRI's last segment, else the text. */
export const valueLabel = (prop: string, v: string) =>
  prop === 'rdf:type' || /^schema:[A-Z]/.test(v)
    ? humanize(v)
    : /^https?:\/\/schema\.org\//.test(v)
      ? humanize(v.split('/').pop() ?? v)
      : v;

const valueKey = (v: unknown) =>
  String(v)
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();

// ── reading values ───────────────────────────────────────────────────────────

const MISSING = Symbol('missing');
type Read = number | ReadonlyArray<string> | typeof MISSING;

const valuesOf = (r: Rateable, prop: string): ReadonlyArray<string | number | boolean> =>
  prop === 'rdf:type' ? r.types : (r.props[prop] ?? []);

const dateOf = (v: unknown): number | undefined => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) {
    return undefined;
  }
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : undefined;
};

const DAY_MS = 86_400_000;

/** A flag test's 0/1, or MISSING when a has-equals or match test's property is absent. */
const flagOf = (r: Rateable, test: FlagTest): number | typeof MISSING => {
  if ('located' in test) {
    return locationOf(r) ? 1 : 0;
  }
  if ('hasAny' in test) {
    return test.hasAny.some((p) => valuesOf(r, p).length > 0) ? 1 : 0;
  }
  if ('has' in test && test.equals === undefined) {
    return valuesOf(r, test.has).length ? 1 : 0;
  }
  const prop = 'has' in test ? test.has : test.match;
  if (!valuesOf(r, prop).length) {
    return MISSING;
  }
  return readValue(r, test as TermValue) ?? MISSING;
};

const read = (r: Rateable, f: ViewFilter): Read => {
  switch (f.kind) {
    case 'range':
      return readValue(r, f.value) ?? MISSING;
    case 'values': {
      const vs = valuesOf(r, f.prop);
      return vs.length ? vs.map(valueKey) : MISSING;
    }
    case 'flag':
      return flagOf(r, f.test);
    case 'date': {
      const ts = valuesOf(r, f.prop)
        .map(dateOf)
        .filter((t): t is number => t !== undefined);
      return ts.length ? Math.max(...ts) : MISSING;
    }
  }
};

const test = (x: Exclude<Read, typeof MISSING>, f: ViewFilter, now: number): boolean => {
  switch (f.kind) {
    case 'range':
      return (f.min === undefined || (x as number) >= f.min) && (f.max === undefined || (x as number) <= f.max);
    case 'values': {
      if (!f.values.length) {
        return true;
      }
      const have = new Set(x as ReadonlyArray<string>);
      const want = f.values.map(valueKey);
      return f.all ? want.every((w) => have.has(w)) : want.some((w) => have.has(w));
    }
    case 'flag':
      return (x as number) >= 1;
    case 'date':
      return (x as number) >= now - f.days * DAY_MS;
  }
};

/** Whether a filter cuts anything as set (an empty checkbox list or an open range does not). */
export const isActive = (f: ViewFilter) =>
  f.kind === 'range' ? f.min !== undefined || f.max !== undefined : f.kind === 'values' ? f.values.length > 0 : true;

export interface ViewContext {
  /** The rating model's scores (sort by score, the tie-break of every other sort). */
  readonly ratings?: ReadonlyMap<string, { readonly score: number }>;
  /** The person's drawn areas, for "closest to your areas". */
  readonly areas?: ReadonlyArray<GeoArea>;
  readonly now?: number;
}

/**
 * For each filter, the kinds (rdf:types) whose results have its value at least once: a result missing the value is
 * unknown when it shares a kind with them, and not applicable otherwise.
 */
const applicability = (results: ReadonlyArray<Rateable>, filters: ReadonlyArray<ViewFilter>) => {
  const kinds = new Map<string, Set<string>>();
  for (const f of filters) {
    const set = new Set<string>();
    for (const r of results) {
      if (read(r, f) !== MISSING) {
        for (const t of r.types) {
          set.add(t);
        }
      }
    }
    kinds.set(f.id, set);
  }
  return kinds;
};

export type Verdict = 'pass' | 'fail' | 'unknown' | 'n/a';

const verdict = (r: Rateable, f: ViewFilter, kinds: ReadonlySet<string> | undefined, now: number): Verdict => {
  const x = read(r, f);
  if (x === MISSING) {
    return r.types.some((t) => kinds?.has(t)) ? 'unknown' : 'n/a';
  }
  return test(x, f, now) ? 'pass' : 'fail';
};

const keeps = (v: Verdict, f: ViewFilter) => v === 'pass' || (v === 'unknown' && f.includeMissing !== false);

export interface Applied<R extends Rateable> {
  /** The results that pass every active filter, sorted. */
  readonly results: R[];
  /** How many each filter let in only because their value is unknown (for "incl. 3 unknown" on its chip). */
  readonly unknown: ReadonlyMap<string, number>;
}

/** Cuts the results by the view's active filters (all must pass) and sorts them. */
export const applyView = <R extends Rateable>(
  results: ReadonlyArray<R>,
  view: ResultsView | null | undefined,
  ctx: ViewContext = {},
): Applied<R> => {
  const now = ctx.now ?? Date.now();
  const filters = (view?.filters ?? []).filter(isActive);
  const kinds = applicability(results, filters);
  const unknown = new Map<string, number>(filters.map((f) => [f.id, 0]));
  const kept = results.filter((r) => {
    const vs = filters.map((f) => verdict(r, f, kinds.get(f.id), now));
    if (!vs.every((v, i) => keeps(v, filters[i]!))) {
      return false;
    }
    vs.forEach((v, i) => v === 'unknown' && unknown.set(filters[i]!.id, (unknown.get(filters[i]!.id) ?? 0) + 1));
    return true;
  });
  return { results: sortResults(kept, view?.sort, ctx), unknown };
};

const score = (ctx: ViewContext, r: Rateable) => ctx.ratings?.get(r.id)?.score ?? 0;

/** The key a sort reads, or undefined (sorted last). Ascending order of the key is the sort's order. */
const sortKey = (r: Rateable, sort: ViewSort, ctx: ViewContext): number | undefined => {
  switch (sort.by) {
    case 'score':
      return -score(ctx, r);
    case 'value': {
      const x = readValue(r, sort.value);
      return x === undefined ? undefined : sort.dir === 'asc' ? x : -x;
    }
    case 'date': {
      const ts = valuesOf(r, sort.prop)
        .map(dateOf)
        .filter((t): t is number => t !== undefined);
      if (!ts.length) {
        return undefined;
      }
      return sort.dir === 'asc' ? Math.min(...ts) : -Math.max(...ts);
    }
    case 'distance': {
      const p = locationOf(r);
      if (!p || !ctx.areas?.length) {
        return undefined;
      }
      // Inside any area counts as 0 m: inside ones then order by score.
      return Math.min(
        ...ctx.areas.map((a) => Math.max(0, signedDistanceM([p.lng, p.lat], a.shape) + Math.max(0, p.precisionM ?? 0))),
      );
    }
  }
};

/** Sorts by the view's sort (default: the rating model's score); results without the key go last; ties by score. */
export const sortResults = <R extends Rateable>(
  results: ReadonlyArray<R>,
  sort: ViewSort | undefined,
  ctx: ViewContext = {},
): R[] => {
  const s = sort ?? { by: 'score' as const };
  const keyed = results.map((r, i) => ({ r, i, k: sortKey(r, s, ctx), sc: score(ctx, r) }));
  keyed.sort((a, b) => {
    if (a.k === undefined || b.k === undefined) {
      if (a.k !== b.k) {
        return a.k === undefined ? 1 : -1;
      }
    } else if (a.k !== b.k) {
      return a.k - b.k;
    }
    return b.sc - a.sc || a.i - b.i;
  });
  return keyed.map((x) => x.r);
};

// ── facets: the filters a session's results allow ────────────────────────────

export interface FacetOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface Facet {
  readonly id: string;
  readonly label: string;
  /** The CURIE(s) it reads, for a tooltip. */
  readonly curie: string;
  readonly kind: ViewFilter['kind'];
  readonly value?: NumValue;
  readonly prop?: string;
  readonly test?: FlagTest;
  /** Results with a value. */
  readonly present: number;
  /** Ranges: bounds over all results; whether every value is a whole number. */
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  /** Checkbox lists: every value with its count over all results, most common first; whether a result has several. */
  readonly options?: ReadonlyArray<FacetOption>;
  readonly multi?: boolean;
  /** The rating model reads it. */
  readonly inModel?: boolean;
  /** Among the 10 shown first; the rest are under "More filters". */
  readonly primary: boolean;
  /** Usefulness: coverage × spread, plus a bonus when the model reads it. */
  readonly rank: number;
}

/** Properties that name, link or place a result rather than describe it, or are coordinates and ids. */
const SKIP = new Set([
  'schema:name',
  'schema:headline',
  'schema:title',
  'lh:title',
  'schema:url',
  'lh:resultUrl',
  'lh:foundBy',
  'schema:mentions',
  'schema:identifier',
  'schema:sameAs',
  'lh:sourcePage',
  'schema:description',
  'schema:image',
  'lh:image',
  'lh:images',
  'schema:thumbnailUrl',
  'schema:logo',
  'schema:latitude',
  'schema:longitude',
  'geo:lat',
  'geo:long',
  'lh:locationPrecisionM',
  'lh:locationUncertaintyM',
  'lh:mapRadiusM',
  'lh:locationId',
  'schema:telephone',
  'schema:openingHours',
  'schema:hasMap',
  'schema:address',
  'schema:geo',
  'schema:offers',
  'schema:additionalProperty',
  'lh:statedStreet',
  'lh:statedHouseNumber',
  'lh:statedPlace',
  'schema:streetAddress',
  'schema:postalCode',
  'lh:extension',
  'lh:rank',
  'lh:matchedFeature',
  'lh:locationSource',
  'lh:locationNote',
  'schema:containedInPlace',
  'lh:imageQuery',
]);
const IMAGE_KEYS = ['schema:image', 'lh:image', 'lh:images', 'schema:thumbnailUrl'];

const isNumeric = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && /^\s*-?\d+([.,]\d+)?\s*$/.test(v));
const isIri = (v: unknown) => typeof v === 'string' && /^(https?|urn):/.test(v);

const numValueId = (v: NumValue) => ('prop' in v ? v.prop : `sum:${v.sum.join('+')}`);
const numValueCurie = (v: NumValue) => ('prop' in v ? v.prop : v.sum.join(' + '));
const flagId = (t: FlagTest) =>
  'located' in t
    ? 'located'
    : 'hasAny' in t
      ? 'photos'
      : 'match' in t
        ? `match:${t.match}/${t.pattern}`
        : t.equals === undefined
          ? `has:${t.has}`
          : `is:${t.has}=${valueKey(t.equals)}`;

const sameNum = (a: NumValue, b: TermValue) =>
  ('prop' in a && 'prop' in b && a.prop === b.prop) ||
  ('sum' in a && 'sum' in b && a.sum.join('+') === b.sum.join('+'));

/** The rating model's label for a value it reads, so a filter is named as the panel names the term. */
const modelLabel = (model: RatingModel | null | undefined, v: NumValue) =>
  model?.terms.find((t) => sameNum(v, t.value))?.label;

const spreadOfOptions = (counts: ReadonlyArray<number>, present: number) => {
  const k = counts.length;
  if (k < 2) {
    return 0;
  }
  if (counts[0]! / Math.max(1, present) > 0.95) {
    return 0.2;
  }
  return k <= 12 ? 1 : k <= 40 ? 0.7 : 0.3;
};

/**
 * The filters the results allow, most useful first: numbers (and the sums the rating model reads) as ranges, short
 * repeated texts as checkbox lists, the model's flag terms and booleans as toggles (plus "Has photos" and "Has a
 * location" where some have and some do not), past dates as "in the last N days". The first 10 are primary.
 */
export const deriveFacets = (
  results: ReadonlyArray<Rateable>,
  model?: RatingModel | null,
  now = Date.now(),
): Facet[] => {
  const n = results.length;
  if (!n) {
    return [];
  }
  const used = new Set<string>();
  for (const v of [...(model?.terms ?? []).map((t) => t.value), ...(model?.require ?? []).map((q) => q.value)]) {
    if (!v || typeof v !== 'object') {
      continue;
    }
    if ('prop' in v) {
      used.add(v.prop);
    }
    if ('sum' in v) {
      used.add(`sum:${v.sum.join('+')}`);
    }
    if ('has' in v) {
      used.add(v.has);
    }
    if ('match' in v) {
      used.add(v.match);
    }
  }
  const out: Array<Omit<Facet, 'primary'>> = [];
  const range = (value: NumValue, label: string) => {
    const xs = results.map((r) => readValue(r, value)).filter((x): x is number => x !== undefined);
    const distinct = new Set(xs).size;
    if (xs.length < 3 || distinct < 2) {
      return;
    }
    const id = numValueId(value);
    const inModel = used.has(id);
    const coverage = xs.length / n;
    out.push({
      id,
      label,
      curie: numValueCurie(value),
      kind: 'range',
      value,
      present: xs.length,
      min: Math.min(...xs),
      max: Math.max(...xs),
      integer: xs.every((x) => Number.isInteger(x)),
      ...(inModel ? { inModel } : {}),
      rank: coverage * (distinct >= 3 ? 1 : 0.5) + (inModel ? 0.6 : 0),
    });
  };

  // Sums the rating model reads (rent + fees): the number people compare.
  for (const t of model?.terms ?? []) {
    if (t.value && typeof t.value === 'object' && 'sum' in t.value) {
      range(t.value, t.label);
    }
  }
  for (const q of model?.require ?? []) {
    if (
      q.value &&
      typeof q.value === 'object' &&
      'sum' in q.value &&
      !out.some((f) => f.id === numValueId(q.value as NumValue))
    ) {
      range(q.value, (q.value as { sum: string[] }).sum.map(labelOf).join(' + '));
    }
  }

  const props = new Set<string>(['rdf:type']);
  for (const r of results) {
    for (const k of Object.keys(r.props)) {
      if (!SKIP.has(k)) {
        props.add(k);
      }
    }
  }
  for (const p of props) {
    const withValue = results.filter((r) => valuesOf(r, p).length > 0);
    if (withValue.length < 3 || withValue.length / n < 0.03) {
      continue;
    }
    const all = withValue.flatMap((r) => valuesOf(r, p));
    if (all.every((v) => typeof v === 'boolean' || v === 'true' || v === 'false')) {
      const yes = withValue.filter((r) => valuesOf(r, p).some((v) => v === true || v === 'true')).length;
      const share = yes / withValue.length;
      out.push({
        id: `is:${p}=true`,
        label: labelOf(p),
        curie: p,
        kind: 'flag',
        test: { has: p, equals: 'true' },
        present: withValue.length,
        rank: (withValue.length / n) * (share > 0.03 && share < 0.97 ? 1 : 0.3) + (used.has(p) ? 0.6 : 0),
      });
      continue;
    }
    if (all.filter(isNumeric).length >= 0.8 * all.length) {
      const nums = all.map((v) => Number(String(v).replace(',', '.')));
      // Ids and codes: every value different and large.
      if (new Set(nums).size === nums.length && nums.length > 5 && Math.min(...nums.map(Math.abs)) > 100_000) {
        continue;
      }
      range({ prop: p }, modelLabel(model, { prop: p }) ?? labelOf(p));
      continue;
    }
    const dates = all.map(dateOf).filter((t): t is number => t !== undefined);
    if (dates.length >= 0.8 * all.length) {
      // Past dates filter as "in the last N days"; future ones (available from) only sort.
      if (dates.filter((t) => t <= now + DAY_MS).length >= 0.7 * dates.length && new Set(dates).size >= 3) {
        out.push({
          id: `date:${p}`,
          label: labelOf(p),
          curie: p,
          kind: 'date',
          prop: p,
          present: withValue.length,
          rank: (withValue.length / n) * 0.8 + (used.has(p) ? 0.3 : 0),
        });
      }
      continue;
    }
    if (all.some(isIri) && p !== 'rdf:type') {
      continue;
    }
    const counts = new Map<string, { label: string; count: number }>();
    for (const r of withValue) {
      for (const key of new Set(valuesOf(r, p).map(valueKey))) {
        const raw = String(valuesOf(r, p).find((v) => valueKey(v) === key));
        if (raw.length > 60) {
          continue;
        }
        const c = counts.get(key) ?? { label: valueLabel(p, raw), count: 0 };
        c.count++;
        counts.set(key, c);
      }
    }
    const options = [...counts.entries()]
      .map(([value, c]) => ({ value, label: c.label, count: c.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    // Free text (every value different) is not a category.
    if (options.length < 2 || options.length > 200 || (options.length > 12 && options.length > 0.6 * all.length)) {
      continue;
    }
    const multi = withValue.some((r) => new Set(valuesOf(r, p).map(valueKey)).size > 1);
    out.push({
      id: p,
      label: labelOf(p),
      curie: p,
      kind: 'values',
      prop: p,
      present: withValue.length,
      options,
      ...(multi ? { multi } : {}),
      ...(used.has(p) ? { inModel: true } : {}),
      rank:
        (withValue.length / n) *
          spreadOfOptions(
            options.map((o) => o.count),
            withValue.length,
          ) *
          (p === 'rdf:type' ? 0.8 : 1) +
        (used.has(p) ? 0.5 : 0),
    });
  }

  // Toggles: the model's flag terms by its labels, then photos and location where they split the results.
  for (const t of model?.terms ?? []) {
    const v = t.value as TermValue;
    if (!v || typeof v !== 'object' || !(('has' in v && v.equals !== undefined) || 'match' in v)) {
      continue;
    }
    const test = v as FlagTest;
    const present = results.filter((r) => flagOf(r, test) === 1).length;
    if (present === 0) {
      continue;
    }
    out.push({
      id: flagId(test),
      label: t.label,
      curie:
        'has' in v
          ? `${v.has} = "${v.equals}"`
          : `${(v as { match: string }).match} ~ /${(v as { pattern: string }).pattern}/`,
      kind: 'flag',
      test,
      present,
      inModel: true,
      rank: 0.9 + Math.min(1, present / n) * 0.3,
    });
  }
  for (const [test, label, curie] of [
    [{ hasAny: IMAGE_KEYS }, 'Has photos', IMAGE_KEYS.join(', ')],
    [{ located: true }, 'Has a location', 'schema:latitude, schema:longitude'],
  ] as Array<[FlagTest, string, string]>) {
    const present = results.filter((r) => flagOf(r, test) === 1).length;
    if (present > 0 && present < n) {
      out.push({
        id: flagId(test),
        label,
        curie,
        kind: 'flag',
        test,
        present,
        rank: 0.35 * Math.min(1, (2 * Math.min(present, n - present)) / n) + 0.1,
      });
    }
  }

  const seen = new Set<string>();
  return out
    .filter((f) => !seen.has(f.id) && (seen.add(f.id), true))
    .sort((a, b) => b.rank - a.rank)
    .map((f, i) => ({ ...f, primary: i < 10 }));
};

/** A new, inactive filter for a facet (the panel's control writes its bounds, values or days into it). */
export const filterFor = (f: Facet): ViewFilter => {
  const base = { id: f.id, label: f.label };
  if (f.kind === 'range') {
    return { ...base, kind: 'range', value: f.value! };
  }
  if (f.kind === 'values') {
    return { ...base, kind: 'values', prop: f.prop!, values: [] };
  }
  if (f.kind === 'flag') {
    return { ...base, kind: 'flag', test: f.test! };
  }
  return { ...base, kind: 'date', prop: f.prop!, days: 7 };
};

export interface FacetCounts {
  /** Results passing every other active filter. */
  readonly base: number;
  /** Of those, how many have no value (unknown or not applicable). */
  readonly missing: number;
  /** Of the missing, how many are unknown (their kind has the value elsewhere): what "include results without this" keeps. */
  readonly unknown: number;
  /** Ranges: a histogram of `bins` buckets between the facet's min and max. */
  readonly histogram?: ReadonlyArray<number>;
  /** Checkbox lists: count per option value. Toggles: how many pass. */
  readonly options?: ReadonlyMap<string, number>;
  readonly yes?: number;
}

/** A facet's live counts: over the results that pass every other active filter, as faceted search counts. */
export const facetCounts = (
  results: ReadonlyArray<Rateable>,
  view: ResultsView | null | undefined,
  facet: Facet,
  ctx: ViewContext & { bins?: number } = {},
): FacetCounts => {
  const now = ctx.now ?? Date.now();
  const others = (view?.filters ?? []).filter((f) => isActive(f) && f.id !== facet.id);
  const kinds = applicability(results, others);
  const base = results.filter((r) => others.every((f) => keeps(verdict(r, f, kinds.get(f.id), now), f)));
  const probe = filterFor(facet);
  const reads = base.map((r) => read(r, probe));
  const missing = reads.filter((x) => x === MISSING).length;
  const kindsWith = applicability(results, [probe]).get(probe.id)!;
  const unknown = base.filter((r, i) => reads[i] === MISSING && r.types.some((t) => kindsWith.has(t))).length;
  if (facet.kind === 'range') {
    const bins = ctx.bins ?? 24;
    const lo = facet.min ?? 0;
    const span = (facet.max ?? lo) - lo || 1;
    const histogram = Array.from({ length: bins }, () => 0);
    for (const x of reads) {
      if (typeof x === 'number') {
        histogram[Math.min(bins - 1, Math.max(0, Math.floor(((x - lo) / span) * bins)))]!++;
      }
    }
    return { base: base.length, missing, unknown, histogram };
  }
  if (facet.kind === 'values') {
    const options = new Map<string, number>();
    for (const x of reads) {
      if (Array.isArray(x)) {
        for (const v of new Set(x)) {
          options.set(v, (options.get(v) ?? 0) + 1);
        }
      }
    }
    return { base: base.length, missing, unknown, options };
  }
  if (facet.kind === 'flag') {
    return { base: base.length, missing, unknown, yes: reads.filter((x) => x === 1).length };
  }
  return { base: base.length, missing, unknown };
};

// ── words ────────────────────────────────────────────────────────────────────

const fmt = (x: number) =>
  Math.abs(x) >= 10_000 ? Math.round(x).toLocaleString('en-US') : String(Math.round(x * 100) / 100);

/** A filter in words, as its chip and the agent read it: "Total monthly cost ≤ 6000", "District: Wola or Mokotów". */
export const describeFilter = (f: ViewFilter): string => {
  switch (f.kind) {
    case 'range':
      return f.min !== undefined && f.max !== undefined
        ? `${f.label} ${fmt(f.min)}–${fmt(f.max)}`
        : f.min !== undefined
          ? `${f.label} ≥ ${fmt(f.min)}`
          : f.max !== undefined
            ? `${f.label} ≤ ${fmt(f.max)}`
            : f.label;
    case 'values': {
      const vs = f.values.map((v) => valueLabel(f.prop, v));
      const list =
        vs.length <= 3
          ? vs.join(f.all ? ' and ' : ' or ')
          : `${vs.slice(0, 2).join(', ')} ${f.all ? 'and' : 'or'} ${vs.length - 2} more`;
      return `${f.label}: ${list}`;
    }
    case 'flag':
      return f.label;
    case 'date':
      return `${f.label} in the last ${f.days === 1 ? 'day' : `${f.days} days`}`;
  }
};

export const describeSort = (s: ViewSort | undefined): string => {
  if (!s || s.by === 'score') {
    return 'Score (the rating model)';
  }
  if (s.by === 'distance') {
    return s.label ?? 'Closest to your areas';
  }
  const label = s.label ?? (s.by === 'value' ? numValueCurie(s.value) : labelOf(s.prop));
  if (s.by === 'date') {
    return `${label}, ${s.dir === 'desc' ? 'newest' : 'oldest'} first`;
  }
  return `${label}, ${s.dir === 'desc' ? 'highest' : 'lowest'} first`;
};

// ── cleaning what a client or the agent sends ────────────────────────────────

const str = (x: unknown, max = 200) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : undefined);
const finite = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const curie = (x: unknown) => (typeof x === 'string' && /^[a-z][a-z0-9]*:[^\s]{1,120}$/i.test(x) ? x : undefined);

const cleanNum = (v: unknown): NumValue | undefined => {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') {
    return undefined;
  }
  if (curie(o.prop)) {
    return { prop: o.prop as string };
  }
  if (Array.isArray(o.sum)) {
    const sum = o.sum
      .map(curie)
      .filter((p): p is string => !!p)
      .slice(0, 6);
    return sum.length ? { sum } : undefined;
  }
  return undefined;
};

const cleanTest = (t: unknown): FlagTest | undefined => {
  const o = t as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') {
    return undefined;
  }
  if (o.located === true) {
    return { located: true };
  }
  if (Array.isArray(o.hasAny)) {
    const hasAny = o.hasAny
      .map(curie)
      .filter((p): p is string => !!p)
      .slice(0, 8);
    return hasAny.length ? { hasAny } : undefined;
  }
  if (curie(o.has)) {
    const equals = typeof o.equals === 'number' ? o.equals : str(o.equals);
    return { has: o.has as string, ...(equals !== undefined ? { equals } : {}) };
  }
  if (curie(o.match) && typeof o.pattern === 'string') {
    try {
      new RegExp(o.pattern, 'i');
    } catch {
      return undefined;
    }
    return { match: o.match as string, pattern: o.pattern.slice(0, 300) };
  }
  return undefined;
};

const cleanFilter = (x: unknown): ViewFilter | undefined => {
  const o = x as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') {
    return undefined;
  }
  const id = str(o.id, 200);
  if (!id) {
    return undefined;
  }
  const base = { id, label: str(o.label, 120) ?? id, ...(o.includeMissing === false ? { includeMissing: false } : {}) };
  if (o.kind === 'range') {
    const value = cleanNum(o.value);
    if (!value) {
      return undefined;
    }
    const min = finite(o.min);
    const max = finite(o.max);
    return {
      ...base,
      kind: 'range',
      value,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
    };
  }
  if (o.kind === 'values') {
    const prop = curie(o.prop);
    if (!prop || !Array.isArray(o.values)) {
      return undefined;
    }
    const values = o.values
      .map((v) => (typeof v === 'number' ? String(v) : str(v)))
      .filter((v): v is string => !!v)
      .slice(0, 100);
    return { ...base, kind: 'values', prop, values, ...(o.all === true ? { all: true } : {}) };
  }
  if (o.kind === 'flag') {
    const test = cleanTest(o.test);
    return test ? { ...base, kind: 'flag', test } : undefined;
  }
  if (o.kind === 'date') {
    const prop = curie(o.prop);
    const days = finite(o.days);
    return prop && days !== undefined && days > 0
      ? { ...base, kind: 'date', prop, days: Math.min(3650, Math.round(days)) }
      : undefined;
  }
  return undefined;
};

const cleanSort = (x: unknown): ViewSort | undefined => {
  const o = x as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') {
    return undefined;
  }
  const label = str(o.label, 120);
  const dir: SortDir = o.dir === 'asc' ? 'asc' : 'desc';
  if (o.by === 'score') {
    return { by: 'score' };
  }
  if (o.by === 'distance') {
    return { by: 'distance', ...(label ? { label } : {}) };
  }
  if (o.by === 'value') {
    const value = cleanNum(o.value);
    return value ? { by: 'value', value, dir, ...(label ? { label } : {}) } : undefined;
  }
  if (o.by === 'date') {
    const prop = curie(o.prop);
    return prop ? { by: 'date', prop, dir, ...(label ? { label } : {}) } : undefined;
  }
  return undefined;
};

/** The view as stored: well-formed filters only (one per id, at most 30), and a sort the scorer knows. */
export const cleanView = (x: unknown): ResultsView => {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const filters = (Array.isArray(o.filters) ? o.filters : [])
    .map(cleanFilter)
    .filter((f): f is ViewFilter => !!f && !seen.has(f.id) && (seen.add(f.id), true))
    .slice(0, 30);
  const sort = cleanSort(o.sort);
  return { filters, ...(sort && sort.by !== 'score' ? { sort } : {}) };
};
