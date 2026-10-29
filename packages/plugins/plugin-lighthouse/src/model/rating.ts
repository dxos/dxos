//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `src/agent/rating.ts` (github.com/dmaretskyi/lighthouse), so the masonry ranks with the
// same model the search agent wrote. Keep the two in step: the agent writes the model, this evaluates it.

import { type Location, distanceMetres, locationOf } from './location.ts';

/** A result as rated: subject id, rdf types, and property values keyed by CURIE (lh:areaM2, schema:name …). */
export interface Rateable {
  readonly id: string;
  readonly types: ReadonlyArray<string>;
  readonly props: Readonly<Record<string, ReadonlyArray<string | number | boolean>>>;
}

/** What a term reads from a result. */
export type TermValue =
  | { readonly prop: string }
  /** Sum of numeric properties, e.g. rent plus fees. */
  | { readonly sum: ReadonlyArray<string> }
  /** 1 when the property is present (optionally equal to a value, case-insensitive), else 0. */
  | { readonly has: string; readonly equals?: string | number }
  /** 1 when any value of the property matches the regex (case-insensitive), else 0. */
  | { readonly match: string; readonly pattern: string }
  /**
   * How well the result's location fits any of these areas (a union): 1 inside one, falling linearly to 0 over the
   * area's soft edge outside it; no location is no value. The person draws these on the map (RatingOverrides.areas).
   */
  | { readonly within: ReadonlyArray<GeoArea> };

/** How a raw value becomes 0..1. */
export type TermShape =
  /** Min-max over the results: the largest scores 1. */
  | 'higher'
  /** Min-max over the results: the smallest scores 1. */
  | 'lower'
  /** 1 at the target, falling linearly to 0 at target ± tolerance. */
  | { readonly target: number; readonly tolerance: number }
  /** 1 inside [min, max], falling linearly to 0 over `soft` outside it. */
  | { readonly min?: number; readonly max?: number; readonly soft?: number }
  /** For has/match terms: the 0/1 value as is. */
  | 'flag';

export interface RatingTerm {
  readonly id: string;
  readonly label: string;
  /** Relative importance; a negative weight turns a term into a penalty. */
  readonly weight: number;
  readonly value: TermValue;
  readonly shape: TermShape;
  /** Score when the result lacks the value (default 0; 0.5 for "unknown is neutral"). */
  readonly missing?: number;
  /** Added by the person (an area they drew), not by the agent. */
  readonly own?: boolean;
}

export interface Requirement {
  readonly label: string;
  readonly value: TermValue;
  readonly op: '<' | '<=' | '>' | '>=' | '=' | '!=';
  readonly target: number | string | boolean;
  /** Added by the person (an area they drew), not by the agent. */
  readonly own?: boolean;
}

export interface RatingModel {
  readonly version: number;
  /** Why the model looks like this: the goal's priorities, and what feedback changed. */
  readonly rationale: string;
  readonly terms: ReadonlyArray<RatingTerm>;
  readonly require?: ReadonlyArray<Requirement>;
  /** Multiplier for each missed requirement (default 0.3). */
  readonly penalty?: number;
  /** Only results with one of these rdf:types are rated; others sort last (default: all). */
  readonly types?: ReadonlyArray<string>;
  readonly updatedAt?: string;
}

export interface Rating {
  readonly score: number;
  readonly terms: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly value?: number | string;
    readonly score: number;
    readonly weight: number;
  }>;
  readonly missed: ReadonlyArray<string>;
}

/**
 * The person's own adjustments to the agent's model, kept apart from it so a rebuild by the agent does not undo them.
 * A term is matched by id: `weight` replaces the agent's weight, `off` drops the term. A requirement is matched by
 * label and can only be turned off.
 */
export interface RatingOverrides {
  readonly terms?: Readonly<Record<string, { readonly weight?: number; readonly off?: boolean }>>;
  readonly require?: Readonly<Record<string, { readonly off?: boolean }>>;
  /**
   * Areas the person drew on the map. The "prefer" ones become one term (id AREA_TERM, a union: the best-fitting
   * area counts), weighted by `terms[AREA_TERM].weight` or the agent's heaviest weight; the "require" ones become
   * one requirement (inside one of them, or within its soft edge).
   */
  readonly areas?: ReadonlyArray<AreaOverride>;
  readonly updatedAt?: string;
}

/** A shape on the map, in GeoJSON order ([lng, lat]); a circle is a centre and a radius in metres. */
export type AreaShape =
  | { readonly type: 'Polygon'; readonly coordinates: ReadonlyArray<ReadonlyArray<readonly [number, number]>> }
  | { readonly type: 'Circle'; readonly center: readonly [number, number]; readonly radiusM: number };

/** A named area a term or requirement reads, with its soft edge: how far outside it a result still scores. */
export interface GeoArea {
  readonly id: string;
  readonly label: string;
  readonly shape: AreaShape;
  /** Metres outside the edge over which the score falls from 1 to 0 (default 0: inside or not). */
  readonly softM?: number;
}

/** An area the person drew: a preference (a term) or a requirement. */
export interface AreaOverride extends GeoArea {
  readonly mode: 'prefer' | 'require';
}

/** The id of the term the person's preferred areas make. */
export const AREA_TERM = 'lh-areas';

/** A drawn area's soft edge when none is set: about a five-minute walk. */
export const DEFAULT_SOFT_M = 400;

/** Where a result is: a point and how far off it may be (`locationOf`, the one reader of coordinates). */
export type GeoPoint = Location;

export { locationOf };

/**
 * Results whose coordinates sit on a linked node (schema:geo → schema:GeoCoordinates) get them as their own
 * properties, so locationOf sees them. The graph flattens these by a reconcile rule; a session's results read
 * from its extraction blobs are not reconciled, so they are flattened here.
 */
export const withLinkedGeo = <E extends Rateable>(
  results: ReadonlyArray<E>,
  all: ReadonlyArray<Rateable> = results,
): E[] => {
  const byId = new Map(all.map((entity) => [entity.id, entity]));
  return results.map((entity) => {
    if (entity.props['schema:latitude']?.length) {
      return entity;
    }
    for (const link of entity.props['schema:geo'] ?? []) {
      const node = typeof link === 'string' ? byId.get(link) : undefined;
      const lat = node?.props['schema:latitude'];
      const lng = node?.props['schema:longitude'];
      if (lat?.length && lng?.length) {
        return { ...entity, props: { ...entity.props, 'schema:latitude': lat, 'schema:longitude': lng } };
      }
    }
    return entity;
  });
};

const EARTH_M = 6371008.8;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres between two [lng, lat] points (haversine). */
export const haversineM = (a: readonly [number, number], b: readonly [number, number]): number =>
  distanceMetres({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });

/**
 * Signed distance in metres from a point to an area's edge: negative inside, positive outside. Polygons are
 * measured in a local flat projection around the point (exact enough at city scale); holes count as outside.
 */
export const signedDistanceM = (p: readonly [number, number], shape: AreaShape): number => {
  if (shape.type === 'Circle') {
    return haversineM(p, shape.center) - shape.radiusM;
  }
  const kx = EARTH_M * rad(1) * Math.cos(rad(p[1]));
  const ky = EARTH_M * rad(1);
  const xy = (q: readonly [number, number]): readonly [number, number] => [(q[0] - p[0]) * kx, (q[1] - p[1]) * ky];
  let inside = false;
  let best = Infinity;
  shape.coordinates.forEach((ring, index) => {
    const points = ring.map(xy);
    let inRing = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) {
        continue;
      }
      const [xi, yi] = a;
      const [xj, yj] = b;
      if (yi > 0 !== yj > 0 && 0 < ((xj - xi) * (0 - yi)) / (yj - yi) + xi) {
        inRing = !inRing;
      }
      // Distance from the origin (the point) to the segment.
      const dx = xj - xi;
      const dy = yj - yi;
      const length = dx * dx + dy * dy;
      const t = length > 0 ? Math.max(0, Math.min(1, -(xi * dx + yi * dy) / length)) : 0;
      best = Math.min(best, Math.hypot(xi + t * dx, yi + t * dy));
    }
    // The first ring is the outline; the rest are holes.
    if (index === 0) {
      inside = inRing;
    } else if (inRing) {
      inside = false;
    }
  });
  return inside ? -best : best;
};

/**
 * How well a point fits an area, 0..1: 1 when it is inside by at least its precision, falling to 0 over the soft
 * edge. An approximate pin counts its precision against it, so a pin 100 m inside the edge with a 300 m precision
 * ring is 200 m out.
 */
export const areaFit = (p: GeoPoint, area: GeoArea): number => {
  const distance = signedDistanceM([p.lng, p.lat], area.shape) + Math.max(0, p.precisionM ?? 0);
  if (distance <= 0) {
    return 1;
  }
  const soft = Math.max(0, area.softM ?? 0);
  return soft > 0 ? clamp(1 - distance / soft) : 0;
};

/** The best fit over areas (a union: inside any of them is inside), or undefined with no location. */
export const fitOf = (result: Rateable, areas: ReadonlyArray<GeoArea>): number | undefined => {
  const p = locationOf(result);
  if (!p) {
    return undefined;
  }
  return areas.reduce((best, area) => Math.max(best, areaFit(p, area)), 0);
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;

const toLngLat = (value: unknown): [number, number] | undefined => {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  const [lng, lat] = value;
  return typeof lng === 'number' && typeof lat === 'number' && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
    ? [lng, lat]
    : undefined;
};

/** A well-formed area shape, or undefined. */
export const cleanShape = (value: unknown): AreaShape | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  if (record.type === 'Circle') {
    const center = toLngLat(record.center);
    const radius = record.radiusM;
    return center && typeof radius === 'number' && radius > 0 && radius <= 50_000
      ? { type: 'Circle', center, radiusM: Math.round(radius) }
      : undefined;
  }
  if (record.type === 'Polygon' && Array.isArray(record.coordinates)) {
    const rings = record.coordinates.slice(0, 8).flatMap((ring) => {
      const points: Array<[number, number]> = Array.isArray(ring)
        ? ring.slice(0, 1000).flatMap((q): Array<[number, number]> => {
            const lngLat = toLngLat(q);
            return lngLat ? [lngLat] : [];
          })
        : [];
      return points.length >= 3 ? [points] : [];
    });
    return rings.length ? { type: 'Polygon', coordinates: rings } : undefined;
  }
  return undefined;
};

/** The person's areas, cleaned: well-formed shapes only, labels and soft edges bounded. */
export const cleanAreas = (value: unknown): AreaOverride[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const areas: AreaOverride[] = [];
  for (const item of value.slice(0, 20)) {
    const record = asRecord(item);
    const id = record?.id;
    const shape = cleanShape(record?.shape);
    if (!record || typeof id !== 'string' || !id || !shape) {
      continue;
    }
    const softM =
      typeof record.softM === 'number' && Number.isFinite(record.softM)
        ? Math.max(0, Math.min(5000, record.softM))
        : DEFAULT_SOFT_M;
    const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim().slice(0, 80) : 'Area';
    areas.push({
      id: id.slice(0, 64),
      label,
      shape,
      mode: record.mode === 'require' ? 'require' : 'prefer',
      softM: Math.round(softM),
    });
  }
  return areas;
};

/** The weight a preferred area gets until the person nudges it: as much as the agent's heaviest term. */
export const defaultAreaWeight = (model: RatingModel): number =>
  Math.max(1, ...model.terms.map((term) => Math.abs(term.weight)));

const areaNames = (areas: ReadonlyArray<GeoArea>): string => {
  const [first, second] = areas;
  return areas.length === 1 && first
    ? `“${first.label}”`
    : areas.length === 2 && first && second
      ? `“${first.label}” or “${second.label}”`
      : `one of ${areas.length} areas`;
};

const strip = (area: AreaOverride): GeoArea => ({
  id: area.id,
  label: area.label,
  shape: area.shape,
  softM: area.softM ?? DEFAULT_SOFT_M,
});

/** The term the person's preferred areas make (before their weight override), or none. */
export const areaTerms = (model: RatingModel, overrides: RatingOverrides | null | undefined): RatingTerm[] => {
  const prefer = cleanAreas(overrides?.areas).filter((area) => area.mode === 'prefer');
  if (!prefer.length) {
    return [];
  }
  return [
    {
      id: AREA_TERM,
      label: `In ${areaNames(prefer)}`,
      weight: defaultAreaWeight(model),
      value: { within: prefer.map(strip) },
      shape: 'flag',
      missing: 0,
      own: true,
    },
  ];
};

/** The requirement the person's required areas make: inside one of them, or within its soft edge. */
export const areaRequirements = (overrides: RatingOverrides | null | undefined): Requirement[] => {
  const required = cleanAreas(overrides?.areas).filter((area) => area.mode === 'require');
  if (!required.length) {
    return [];
  }
  return [
    { label: `Inside ${areaNames(required)}`, value: { within: required.map(strip) }, op: '>', target: 0, own: true },
  ];
};

/** The model the panel ranks with: the agent's model with the person's adjustments (and drawn areas) applied. */
export const applyOverrides = (model: RatingModel, overrides: RatingOverrides | null | undefined): RatingModel => {
  if (!overrides) {
    return model;
  }
  const terms = [...model.terms, ...areaTerms(model, overrides)]
    .filter((term) => !overrides.terms?.[term.id]?.off)
    .map((term) => {
      const weight = overrides.terms?.[term.id]?.weight;
      return typeof weight === 'number' && Number.isFinite(weight) ? { ...term, weight } : term;
    });
  const required = areaRequirements(overrides);
  const require = [
    ...(model.require ?? []).filter((requirement) => !overrides.require?.[requirement.label]?.off),
    ...required,
  ];
  return { ...model, terms, ...(model.require || required.length ? { require } : {}) };
};

/** Whether any adjustment differs from the agent's model (a weight equal to the agent's counts as none). */
export const hasOverrides = (
  model: RatingModel | null | undefined,
  overrides: RatingOverrides | null | undefined,
): boolean =>
  !!model &&
  !!overrides &&
  ((overrides.areas?.length ?? 0) > 0 ||
    model.terms.some((term) => {
      const override = overrides.terms?.[term.id];
      return !!override && (override.off || (typeof override.weight === 'number' && override.weight !== term.weight));
    }) ||
    (model.require ?? []).some((requirement) => overrides.require?.[requirement.label]?.off));

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[\s ]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) && value.trim() !== '' ? parsed : undefined;
  }
  return undefined;
};

/** The raw value a term reads: a number, or undefined when the result lacks it. */
export const readValue = (result: Rateable, value: TermValue): number | undefined => {
  // A model stored before validation covered requirements may hold a bare string here; it reads as no value.
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  if ('within' in value) {
    return fitOf(result, value.within);
  }
  if ('prop' in value) {
    return toNumber(result.props[value.prop]?.[0]);
  }
  if ('sum' in value) {
    const parts = value.sum.map((prop) => toNumber(result.props[prop]?.[0]));
    if (parts.every((part) => part === undefined)) {
      return undefined;
    }
    return parts.reduce<number>((total, part) => total + (part ?? 0), 0);
  }
  if ('has' in value) {
    const values = value.has === 'rdf:type' ? result.types : (result.props[value.has] ?? []);
    if (value.equals === undefined) {
      return values.length ? 1 : 0;
    }
    // Loose match: case, and _ / - / spaces, are ignored, so "air conditioning" matches air_conditioning.
    const normalize = (text: unknown) =>
      String(text)
        .toLowerCase()
        .replace(/[\s_-]+/g, ' ')
        .trim();
    return values.some((candidate) => normalize(candidate) === normalize(value.equals)) ? 1 : 0;
  }
  let pattern: RegExp;
  try {
    pattern = new RegExp(value.pattern, 'i');
  } catch {
    return undefined;
  }
  const values = value.match === 'rdf:type' ? result.types : (result.props[value.match] ?? []);
  return values.some((candidate) => pattern.test(String(candidate))) ? 1 : 0;
};

const compare = (left: number | string | boolean, op: Requirement['op'], right: number | string | boolean) => {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber !== undefined && rightNumber !== undefined) {
    switch (op) {
      case '<':
        return leftNumber < rightNumber;
      case '<=':
        return leftNumber <= rightNumber;
      case '>':
        return leftNumber > rightNumber;
      case '>=':
        return leftNumber >= rightNumber;
      case '=':
        return leftNumber === rightNumber;
      case '!=':
        return leftNumber !== rightNumber;
    }
  }
  const leftText = String(left).toLowerCase();
  const rightText = String(right).toLowerCase();
  return op === '=' ? leftText === rightText : op === '!=' ? leftText !== rightText : false;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const shapeScore = (term: RatingTerm, value: number, bounds: { lo: number; hi: number } | undefined): number => {
  const shape = term.shape;
  if (shape === 'flag') {
    return clamp(value);
  }
  if (shape === 'higher' || shape === 'lower') {
    const span = bounds ? bounds.hi - bounds.lo : 0;
    // Every result the same: each scores 1, for "lower" too.
    if (!bounds || span <= 0) {
      return 1;
    }
    const unit = (value - bounds.lo) / span;
    return shape === 'higher' ? unit : 1 - unit;
  }
  if ('target' in shape) {
    return clamp(1 - Math.abs(value - shape.target) / Math.max(shape.tolerance, 1e-9));
  }
  const { min = -Infinity, max = Infinity, soft = 0 } = shape;
  const outside = value < min ? min - value : value > max ? value - max : 0;
  return outside === 0 ? 1 : soft > 0 ? clamp(1 - outside / soft) : 0;
};

/** Rates every result; scores are 0..1, comparable within the set. */
export const rateAll = (model: RatingModel, results: ReadonlyArray<Rateable>): Map<string, Rating> => {
  const scope = model.types ?? [];
  const inScope = (result: Rateable) => scope.length === 0 || result.types.some((type) => scope.includes(type));
  const scoped = results.filter(inScope);

  // Min-max bounds per term, over the results in scope.
  const bounds = new Map<string, { lo: number; hi: number }>();
  for (const term of model.terms) {
    if (term.shape !== 'higher' && term.shape !== 'lower') {
      continue;
    }
    const values = scoped
      .map((result) => readValue(result, term.value))
      .filter((value): value is number => value !== undefined);
    if (values.length) {
      bounds.set(term.id, { lo: Math.min(...values), hi: Math.max(...values) });
    }
  }

  const totalWeight = model.terms.reduce((total, term) => total + Math.abs(term.weight), 0) || 1;
  const negatives = model.terms
    .filter((term) => term.weight < 0)
    .reduce((total, term) => total + Math.abs(term.weight), 0);
  const ratings = new Map<string, Rating>();
  for (const result of results) {
    if (!inScope(result)) {
      ratings.set(result.id, { score: 0, terms: [], missed: ['not in scope'] });
      continue;
    }

    let sum = 0;
    const terms: Array<Rating['terms'][number]> = [];
    for (const term of model.terms) {
      const value = readValue(result, term.value);
      const score = value === undefined ? (term.missing ?? 0) : shapeScore(term, value, bounds.get(term.id));
      // A negative weight is a penalty: it subtracts when the term scores high.
      sum += term.weight * score;
      terms.push({
        id: term.id,
        label: term.label,
        ...(value !== undefined ? { value: Math.round(value * 100) / 100 } : {}),
        score: Math.round(score * 100) / 100,
        weight: term.weight,
      });
    }

    let score = clamp((sum + negatives) / totalWeight);
    const missed: string[] = [];
    for (const requirement of model.require ?? []) {
      const raw =
        typeof requirement.value === 'object' && 'prop' in requirement.value && typeof requirement.target === 'string'
          ? result.props[requirement.value.prop]?.[0]
          : readValue(result, requirement.value);
      if (raw === undefined || !compare(raw, requirement.op, requirement.target)) {
        missed.push(requirement.label);
        score *= model.penalty ?? 0.3;
      }
    }
    ratings.set(result.id, { score: Math.round(score * 1000) / 1000, terms, missed });
  }
  return ratings;
};

/** Orders results by score (highest first); without a model the order they were found in is kept. */
export const rank = <T extends Rateable>(
  results: ReadonlyArray<T>,
  model: RatingModel | undefined,
  overrides: RatingOverrides | undefined,
): { ranked: T[]; ratings: Map<string, Rating> | undefined } => {
  if (!model) {
    return { ranked: [...results], ratings: undefined };
  }
  const ratings = rateAll(applyOverrides(model, overrides), results);
  const ranked = [...results].sort((a, b) => (ratings.get(b.id)?.score ?? 0) - (ratings.get(a.id)?.score ?? 0));
  return { ranked, ratings };
};
