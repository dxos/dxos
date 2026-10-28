//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `src/agent/rating.ts` (github.com/dmaretskyi/lighthouse), so the masonry ranks with the
// same model the search agent wrote. Keep the two in step: the agent writes the model, this evaluates it.

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
  | { readonly match: string; readonly pattern: string };

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
}

export interface Requirement {
  readonly label: string;
  readonly value: TermValue;
  readonly op: '<' | '<=' | '>' | '>=' | '=' | '!=';
  readonly target: number | string | boolean;
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
  readonly updatedAt?: string;
}

/** The model the panel ranks with: the agent's model with the person's adjustments applied. */
export const applyOverrides = (model: RatingModel, overrides: RatingOverrides | null | undefined): RatingModel => {
  if (!overrides) {
    return model;
  }
  const terms = model.terms
    .filter((term) => !overrides.terms?.[term.id]?.off)
    .map((term) => {
      const weight = overrides.terms?.[term.id]?.weight;
      return typeof weight === 'number' && Number.isFinite(weight) ? { ...term, weight } : term;
    });
  const require = model.require?.filter((requirement) => !overrides.require?.[requirement.label]?.off);
  return { ...model, terms, ...(model.require ? { require } : {}) };
};

/** Whether any adjustment differs from the agent's model (a weight equal to the agent's counts as none). */
export const hasOverrides = (
  model: RatingModel | null | undefined,
  overrides: RatingOverrides | null | undefined,
): boolean =>
  !!model &&
  !!overrides &&
  (model.terms.some((term) => {
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
    const unit = bounds && span > 0 ? (value - bounds.lo) / span : 1;
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
        'prop' in requirement.value && typeof requirement.target === 'string'
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
