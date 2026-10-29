//
// Copyright 2026 DXOS.org
//

// Pure helpers for the rating model panel (lighthouse's `web/src/components/ModelPanel.tsx`): each term described
// and written as a formula with the session's numbers, and the person's adjustments edited.

import {
  type GeoArea,
  type Rateable,
  type RatingModel,
  type RatingOverrides,
  type RatingTerm,
  type Requirement,
  type TermShape,
  type TermValue,
  areaRequirements,
  areaTerms,
  locationOf,
  readValue,
} from './rating.ts';

const local = (curie: string) =>
  curie
    .replace(/^[a-z]+:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

/** has/match terms read 0 or 1 for every result, so their coverage is how many match. */
export const isFlag = (value: TermValue): boolean => 'has' in value || 'match' in value || 'within' in value;

const metres = (value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10} km` : `${Math.round(value)} m`);

const areaList = (areas: ReadonlyArray<GeoArea>) => areas.map((area) => `"${area.label}"`).join(' or ');

/** One area's fit: 1 inside, else falling linearly over its soft edge. */
export const areaExpression = (area: GeoArea): string =>
  area.softM
    ? `inside(area "${area.label}") ? 1 : max(0, 1 - dist / ${metres(area.softM)})`
    : `inside(area "${area.label}")`;

/** What `dist` means in an area formula. */
export const DIST_NOTE = "dist: metres from the pin to the area's edge, plus the pin's precision";

/** What a term reads, in words: "rating value", "rent + admin fee", "name matches /.../". */
export const describeValue = (value: TermValue): string => {
  if ('within' in value) {
    return `location in ${areaList(value.within)}`;
  }
  if ('prop' in value) {
    return local(value.prop);
  }
  if ('sum' in value) {
    return value.sum.map(local).join(' + ');
  }
  if ('has' in value) {
    return value.equals !== undefined ? `${local(value.has)} is "${value.equals}"` : `has ${local(value.has)}`;
  }
  return `${local(value.match)} matches /${value.pattern}/`;
};

/** How a term scores, in words: "higher is better", "best near 4.9 (±0.15)". */
export const describeShape = (shape: TermShape): string => {
  if (shape === 'higher') {
    return 'higher is better';
  }
  if (shape === 'lower') {
    return 'lower is better';
  }
  if (shape === 'flag') {
    return 'yes scores 1';
  }
  if ('target' in shape) {
    return `best near ${shape.target} (±${shape.tolerance})`;
  }
  const range =
    shape.min !== undefined && shape.max !== undefined
      ? `${shape.min}-${shape.max}`
      : shape.min !== undefined
        ? `>= ${shape.min}`
        : `<= ${shape.max}`;
  return `best ${range}${(shape.soft ?? 0) > 0 ? `, fading over ${shape.soft}` : ''}`;
};

const formatNumber = (value: number) =>
  Math.abs(value) >= 10_000 ? Math.round(value).toLocaleString('en-US') : String(Math.round(value * 100) / 100);

/** The raw value x a term reads, as an expression over CURIEs. */
export const valueExpression = (value: TermValue): string => {
  if ('within' in value) {
    const [only] = value.within;
    return value.within.length === 1 && only
      ? areaExpression(only)
      : `max(${value.within.map((area) => `(${areaExpression(area)})`).join(', ')})`;
  }
  if ('prop' in value) {
    return value.prop;
  }
  if ('sum' in value) {
    return value.sum.join(' + ');
  }
  if ('has' in value) {
    return value.equals !== undefined ? `${value.has} = "${value.equals}"` : `has(${value.has})`;
  }
  return `${value.match} ~ /${value.pattern}/i`;
};

export type Bounds = { lo: number; hi: number };

/** The min-max bounds of a higher/lower term over the results in the model's scope, as `rateAll` computes them. */
export const boundsOf = (model: RatingModel, term: RatingTerm, items: readonly Rateable[]): Bounds | undefined => {
  if (term.shape !== 'higher' && term.shape !== 'lower') {
    return undefined;
  }
  const scope = model.types ?? [];
  const values = items
    .filter((item) => scope.length === 0 || item.types.some((type) => scope.includes(type)))
    .map((item) => readValue(item, term.value))
    .filter((value): value is number => value !== undefined);
  return values.length ? { lo: Math.min(...values), hi: Math.max(...values) } : undefined;
};

/** The term's score s in [0, 1] as a formula with this session's numbers (bounds, target or range). */
export const termExpression = (term: RatingTerm, bounds: Bounds | undefined): string => {
  const x = valueExpression(term.value);
  const grouped = 'sum' in term.value && term.value.sum.length > 1 ? `(${x})` : x;
  const shape = term.shape;
  let body: string;
  if (shape === 'flag') {
    body = x;
  } else if (shape === 'higher' || shape === 'lower') {
    if (!bounds) {
      body = `${shape === 'higher' ? '(x - lo)' : '(hi - x)'} / (hi - lo)  (no values yet)`;
    } else if (bounds.hi === bounds.lo) {
      body = `1  (every result has ${formatNumber(bounds.lo)})`;
    } else {
      body =
        shape === 'higher'
          ? `(${grouped} - ${formatNumber(bounds.lo)}) / ${formatNumber(bounds.hi - bounds.lo)}`
          : `(${formatNumber(bounds.hi)} - ${grouped}) / ${formatNumber(bounds.hi - bounds.lo)}`;
    }
  } else if ('target' in shape) {
    body = `max(0, 1 - |${grouped} - ${formatNumber(shape.target)}| / ${formatNumber(shape.tolerance)})`;
  } else {
    const soft = (shape.soft ?? 0) > 0 ? (shape.soft ?? 0) : 0;
    const { min, max } = shape;
    const range =
      min !== undefined && max !== undefined
        ? `${formatNumber(min)} <= ${grouped} <= ${formatNumber(max)}`
        : min !== undefined
          ? `${grouped} >= ${formatNumber(min)}`
          : `${grouped} <= ${formatNumber(max ?? Infinity)}`;
    const outside =
      min !== undefined && max !== undefined
        ? `dist(${x}, [${formatNumber(min)}, ${formatNumber(max)}])`
        : min !== undefined
          ? `max(0, ${formatNumber(min)} - ${grouped})`
          : `max(0, ${grouped} - ${formatNumber(max ?? Infinity)})`;
    body = soft ? `max(0, 1 - ${outside} / ${formatNumber(soft)})` : range;
  }
  const missing =
    term.missing !== undefined && term.missing !== 0 && !isFlag(term.value) ? `;  missing -> ${term.missing}` : '';
  return `s = ${body}${missing}`;
};

/** A requirement as an expression: `lh:monthlyPrice < 4000`, `schema:addressLocality = "Mokotów"`. */
export const requirementExpression = (requirement: Requirement): string => {
  if ('within' in requirement.value) {
    return requirement.value.within
      .map((area) =>
        area.softM ? `inside(area "${area.label}") or dist < ${metres(area.softM)}` : `inside(area "${area.label}")`,
      )
      .join(' or ');
  }
  const target =
    typeof requirement.target === 'string' && !/^-?\d+(\.\d+)?$/.test(requirement.target.trim())
      ? `"${requirement.target}"`
      : String(requirement.target);
  return `${valueExpression(requirement.value)} ${requirement.op} ${target}`;
};

/** The total score as a formula over the terms that are on. */
export const scoreExpression = (model: RatingModel, overrides: RatingOverrides): string => {
  const hasPenalty = model.terms.some(
    (term) => !overrides.terms?.[term.id]?.off && (overrides.terms?.[term.id]?.weight ?? term.weight) < 0,
  );
  const requirements =
    (model.require ?? []).some((requirement) => !overrides.require?.[requirement.label]?.off) ||
    areaRequirements(overrides).length > 0;
  return `score = (\u03A3 w\u1D62·s\u1D62${hasPenalty ? ' + \u03A3|negative w\u1D62|' : ''}) / \u03A3|w\u1D62|${requirements ? ` × ${model.penalty ?? 0.3}^(missed requirements)` : ''}`;
};

/**
 * An expression in parts, so the CURIE prefixes can be dimmed: odd parts are prefixes (`schema:`), even parts the
 * rest. The namespace is what tells `lh:category` from `schema:category`.
 */
export const expressionParts = (text: string): string[] => text.split(/\b([a-z][a-z0-9]*:)(?=[A-Za-z])/);

export const roundWeight = (weight: number): number => Math.round(weight * 100) / 100;

/** The nudge step for a weight: 0.25, or 0.5 for weights of 2 and up. */
export const stepOf = (term: RatingTerm): number => (Math.abs(term.weight) >= 2 ? 0.5 : 0.25);

/** The slider's reach: twice the largest weight the agent wrote, at least 2. */
export const weightRange = (model: RatingModel): number =>
  Math.max(1, ...model.terms.map((term) => Math.abs(term.weight))) * 2;

export type TermRow = {
  term: RatingTerm;
  weight: number;
  off: boolean;
  /** The person's weight differs from the agent's. */
  nudged: boolean;
  /** Results that have the value (or match, for a flag term). */
  coverage: number;
  /** The term's share of the total weight of the terms that are on, 0..1. */
  share: number;
};

/** Each term with the person's adjustments applied, its coverage and its share. */
export const termRows = (model: RatingModel, overrides: RatingOverrides, items: readonly Rateable[]): TermRow[] => {
  // The person's preferred areas make one more term (`lh-areas`), weighted and turned off like the agent's.
  const rows = [...model.terms, ...areaTerms(model, overrides)].map((term) => {
    const override = overrides.terms?.[term.id];
    const weight = typeof override?.weight === 'number' ? override.weight : term.weight;
    const coverage = items.filter((item) =>
      isFlag(term.value) ? readValue(item, term.value) === 1 : readValue(item, term.value) !== undefined,
    ).length;
    return {
      term,
      weight,
      off: !!override?.off,
      nudged: typeof override?.weight === 'number' && override.weight !== term.weight,
      coverage,
      share: 0,
    };
  });
  const total = rows.filter((row) => !row.off).reduce((sum, row) => sum + Math.abs(row.weight), 0) || 1;
  return rows.map((row) => ({ ...row, share: row.off ? 0 : Math.abs(row.weight) / total }));
};

/** How many terms and requirements the person adjusted; a drawn area's term or requirement counts as one. */
export const adjustedCount = (model: RatingModel, overrides: RatingOverrides | undefined): number =>
  overrides
    ? termRows(model, overrides, []).filter((row) => row.off || row.nudged || row.term.own).length +
      (model.require ?? []).filter((requirement) => overrides.require?.[requirement.label]?.off).length +
      areaRequirements(overrides).length
    : 0;

/** Results with a point to place, read through `locationOf`. */
export const locatedCount = (items: readonly Rateable[]): number => items.filter((item) => locationOf(item)).length;

/** The overrides with every drawn area preferred, or every one required. */
export const setAreasMode = (overrides: RatingOverrides, mode: 'prefer' | 'require'): RatingOverrides => ({
  ...overrides,
  areas: (overrides.areas ?? []).map((area) => ({ ...area, mode })),
});

/** One area switched between a preference and a requirement; the panel lists each area so it can be changed alone. */
export const setAreaMode = (overrides: RatingOverrides, id: string, mode: 'prefer' | 'require'): RatingOverrides => ({
  ...overrides,
  areas: (overrides.areas ?? []).map((area) => (area.id === id ? { ...area, mode } : area)),
});

/** The overrides without one drawn area. */
export const removeArea = (overrides: RatingOverrides, id: string): RatingOverrides => ({
  ...overrides,
  areas: (overrides.areas ?? []).filter((area) => area.id !== id),
});

/** What reset leaves: the agent's model, with the person's drawn areas kept (they are a place, not a nudge). */
export const resetOverrides = (overrides: RatingOverrides): RatingOverrides =>
  overrides.areas?.length ? { areas: overrides.areas } : {};

/**
 * The overrides with one term's adjustment changed: `weight: undefined` returns to the agent's weight, `off: false`
 * turns it back on; a term with no adjustment left is dropped.
 */
export const setTermOverride = (
  overrides: RatingOverrides,
  id: string,
  patch: { weight?: number | undefined; off?: boolean },
): RatingOverrides => {
  const merged: { weight?: number; off?: boolean } = { ...overrides.terms?.[id] };
  if ('weight' in patch) {
    if (patch.weight === undefined) {
      delete merged.weight;
    } else {
      merged.weight = patch.weight;
    }
  }
  if ('off' in patch) {
    if (patch.off) {
      merged.off = true;
    } else {
      delete merged.off;
    }
  }
  const terms = { ...overrides.terms };
  if (Object.keys(merged).length) {
    terms[id] = merged;
  } else {
    delete terms[id];
  }
  return { ...overrides, terms };
};

/** The overrides with one requirement turned off or back on. */
export const setRequirementOverride = (overrides: RatingOverrides, label: string, off: boolean): RatingOverrides => {
  const require = { ...overrides.require };
  if (off) {
    require[label] = { off: true };
  } else {
    delete require[label];
  }
  return { ...overrides, require };
};
