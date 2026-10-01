//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

/** A jq-like path into the check input, e.g. `.args.to` or `.caller.role`; `.` is the input itself. */
export type Selector = string;

export type Comparison = '==' | '!=' | '<' | '<=' | '>' | '>=';

/**
 * One predicate in UCAN's policy language, plus `in`: a JSON array whose first element is the
 * operator. Kept as plain arrays so a policy is serializable and renders for a consent prompt.
 */
export type Predicate =
  | readonly [Comparison, Selector, unknown]
  | readonly ['in', Selector, readonly unknown[]]
  | readonly ['like', Selector, string]
  | readonly ['and', readonly Predicate[]]
  | readonly ['or', readonly Predicate[]]
  | readonly ['not', Predicate]
  | readonly ['all', Selector, Predicate]
  | readonly ['any', Selector, Predicate];

/** A policy is a conjunction of predicates. */
export type Policy = readonly Predicate[];

const COMPARISONS: readonly string[] = ['==', '!=', '<', '<=', '>', '>='];

const isSelector = (value: unknown): value is Selector => typeof value === 'string' && value.startsWith('.');

export const isPredicate = (value: unknown): value is Predicate => {
  if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== 'string') {
    return false;
  }
  const [op, second, third] = value;
  if (COMPARISONS.includes(op)) {
    return value.length === 3 && isSelector(second);
  }
  switch (op) {
    case 'in':
      return value.length === 3 && isSelector(second) && Array.isArray(third);
    case 'like':
      return value.length === 3 && isSelector(second) && typeof third === 'string';
    case 'and':
    case 'or':
      return value.length === 2 && Array.isArray(second) && second.every(isPredicate);
    case 'not':
      return value.length === 2 && isPredicate(second);
    case 'all':
    case 'any':
      return value.length === 3 && isSelector(second) && isPredicate(third);
    default:
      return false;
  }
};

export const Predicate = Schema.Unknown.pipe(
  Schema.refine((value): value is Predicate => isPredicate(value)),
  Schema.annotate({ title: 'Predicate', description: 'A UCAN policy predicate as a JSON array.' }),
);

export const Policy = Schema.Array(Predicate).pipe(Schema.annotate({ title: 'Policy' }));

export const isPolicy = (value: unknown): value is Policy => Schema.is(Policy)(value);

//
// Builders.
//

export const eq = (selector: Selector, value: unknown): Predicate => ['==', selector, value];
export const neq = (selector: Selector, value: unknown): Predicate => ['!=', selector, value];
export const lt = (selector: Selector, value: number): Predicate => ['<', selector, value];
export const lte = (selector: Selector, value: number): Predicate => ['<=', selector, value];
export const gt = (selector: Selector, value: number): Predicate => ['>', selector, value];
export const gte = (selector: Selector, value: number): Predicate => ['>=', selector, value];
export const within = (selector: Selector, values: readonly unknown[]): Predicate => ['in', selector, values];
export const like = (selector: Selector, glob: string): Predicate => ['like', selector, glob];
export const and = (predicates: readonly Predicate[]): Predicate => ['and', predicates];
export const or = (predicates: readonly Predicate[]): Predicate => ['or', predicates];
export const not = (predicate: Predicate): Predicate => ['not', predicate];
export const all = (selector: Selector, predicate: Predicate): Predicate => ['all', selector, predicate];
export const any = (selector: Selector, predicate: Predicate): Predicate => ['any', selector, predicate];

/** Flattens policies into one conjunction, dropping duplicate predicates. */
export const conjoin = (policies: readonly Policy[]): Policy => {
  const seen = new Set<string>();
  const result: Predicate[] = [];
  for (const policy of policies) {
    for (const predicate of policy) {
      const key = JSON.stringify(predicate);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(predicate);
      }
    }
  }
  return result;
};

/** Every selector a predicate reads, including those nested under `and`, `or`, `not`, `all` and `any`. */
export const selectors = (predicate: Predicate): readonly Selector[] => {
  const [op] = predicate;
  switch (op) {
    case 'and':
    case 'or':
      return predicate[1].flatMap(selectors);
    case 'not':
      return selectors(predicate[1]);
    case 'all':
    case 'any':
      return [predicate[1], ...selectors(predicate[2])];
    default:
      return [predicate[1]];
  }
};

/** The predicates of a policy that read only caller facts, which is all that can be judged without args. */
export const callerOnly = (policy: Policy): Policy =>
  policy.filter((predicate) => selectors(predicate).every((selector) => selector.startsWith('.caller')));

//
// Evaluation.
//

/** The two roots a selector can read: the operation's arguments and facts about the invoker. */
export type Input = { readonly args: unknown; readonly caller: unknown };

export type FailedPredicate = { readonly predicate: Predicate; readonly path: string; readonly actual: unknown };

/** Reads a dotted path; a missing segment yields undefined rather than throwing. */
export const select = (input: unknown, selector: Selector): unknown => {
  if (selector === '.') {
    return input;
  }
  return selector
    .slice(1)
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' || typeof current === 'function') {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, input);
};

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => deepEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]))
  );
};

const globToRegExp = (glob: string): RegExp =>
  new RegExp(
    `^${glob
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
  );

const compare = (op: Comparison, actual: unknown, expected: unknown): boolean => {
  switch (op) {
    case '==':
      return deepEqual(actual, expected);
    case '!=':
      return !deepEqual(actual, expected);
    default: {
      if (typeof actual !== 'number' || typeof expected !== 'number') {
        return false;
      }
      switch (op) {
        case '<':
          return actual < expected;
        case '<=':
          return actual <= expected;
        case '>':
          return actual > expected;
        case '>=':
          return actual >= expected;
      }
    }
  }
};

const values = (collection: unknown): unknown[] | undefined => {
  if (Array.isArray(collection)) {
    return collection;
  }
  if (collection !== null && typeof collection === 'object') {
    return Object.values(collection);
  }
  return undefined;
};

/** Evaluates one predicate against the input; selectors are relative to `input`. */
export const holds = (predicate: Predicate, input: unknown): boolean => {
  const [op] = predicate;
  switch (op) {
    case 'and':
      return predicate[1].every((child) => holds(child, input));
    case 'or':
      return predicate[1].some((child) => holds(child, input));
    case 'not':
      return !holds(predicate[1], input);
    case 'in':
      return predicate[2].some((candidate) => deepEqual(select(input, predicate[1]), candidate));
    case 'like': {
      const actual = select(input, predicate[1]);
      return typeof actual === 'string' && globToRegExp(predicate[2]).test(actual);
    }
    case 'all': {
      const items = values(select(input, predicate[1]));
      return items !== undefined && items.every((item) => holds(predicate[2], item));
    }
    case 'any': {
      const items = values(select(input, predicate[1]));
      return items !== undefined && items.some((item) => holds(predicate[2], item));
    }
    default:
      return compare(op, select(input, predicate[1]), predicate[2]);
  }
};

/** Evaluates a policy (a conjunction) and reports the first predicate that fails. */
export const evaluate = (policy: Policy, input: Input): Result.Result<true, FailedPredicate> => {
  for (const predicate of policy) {
    if (!holds(predicate, input)) {
      const path = typeof predicate[1] === 'string' ? predicate[1] : '.';
      return Result.fail({ predicate, path, actual: select(input, path) });
    }
  }
  return Result.succeed(true);
};

const describePredicate = (predicate: Predicate): string => {
  const [op] = predicate;
  switch (op) {
    case '==':
      return `${predicate[1]} is ${JSON.stringify(predicate[2])}`;
    case '!=':
      return `${predicate[1]} is not ${JSON.stringify(predicate[2])}`;
    case '<':
      return `${predicate[1]} is below ${predicate[2]}`;
    case '<=':
      return `${predicate[1]} is at most ${predicate[2]}`;
    case '>':
      return `${predicate[1]} is above ${predicate[2]}`;
    case '>=':
      return `${predicate[1]} is at least ${predicate[2]}`;
    case 'in':
      return `${predicate[1]} is one of ${predicate[2].map((value) => JSON.stringify(value)).join(', ')}`;
    case 'like':
      return `${predicate[1]} matches ${predicate[2]}`;
    case 'and':
      return `(${predicate[1].map(describePredicate).join(' and ')})`;
    case 'or':
      return `(${predicate[1].map(describePredicate).join(' or ')})`;
    case 'not':
      return `not (${describePredicate(predicate[1])})`;
    case 'all':
      return `every item of ${predicate[1]} has ${describePredicate(predicate[2])}`;
    case 'any':
      return `some item of ${predicate[1]} has ${describePredicate(predicate[2])}`;
  }
};

/** Renders a policy as one sentence for a consent prompt. */
export const describe = (policy: Policy): string =>
  policy.length === 0 ? 'no conditions' : policy.map(describePredicate).join(' and ');
