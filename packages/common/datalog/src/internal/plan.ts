//
// Copyright 2026 DXOS.org
//

import type * as Ast from '../Ast.ts';
import * as Builtin from '../Builtin.ts';

/** A term resolved against a rule's variable slots; `wild` is an anonymous variable. */
export type Ref =
  | { readonly kind: 'const'; readonly value: Ast.Value }
  | { readonly kind: 'slot'; readonly slot: number }
  | { readonly kind: 'wild' };

export type ScanStep = {
  readonly kind: 'scan';
  readonly literal: number;
  readonly relation: string;
  /** Columns whose value is known before the scan, with the value source. */
  readonly bound: ReadonlyArray<{ readonly column: number; readonly ref: Ref }>;
  /** Columns that bind a slot, or check it when the variable repeats within the atom. */
  readonly binds: ReadonlyArray<{ readonly column: number; readonly slot: number }>;
};

export type NegationStep = {
  readonly kind: 'negation';
  readonly relation: string;
  readonly bound: ReadonlyArray<{ readonly column: number; readonly ref: Ref }>;
};

export type CompareStep = {
  readonly kind: 'compare';
  readonly operator: Ast.ComparisonOperator;
  readonly left: Ref;
  readonly right: Ref;
  /** Set for `X = term` with `X` unbound: assigns instead of comparing. */
  readonly assign?: { readonly slot: number; readonly from: Ref };
};

export type BuiltinStep = {
  readonly kind: 'builtin';
  readonly builtin: Builtin.Builtin;
  readonly args: ReadonlyArray<Ref>;
  /** Arguments unbound at call time, passed as `undefined` and bound from the results. */
  readonly free: ReadonlyArray<boolean>;
  readonly negated: boolean;
};

export type AggregateStep = {
  readonly kind: 'aggregate';
  readonly function: Ast.AggregateFunction;
  readonly steps: ReadonlyArray<Step>;
  /** Slots local to the aggregate body; distinct assignments of these are aggregated. */
  readonly local: ReadonlyArray<number>;
  readonly target?: Ref;
  readonly result: Ref;
  readonly assignResult: boolean;
};

export type Step = ScanStep | NegationStep | CompareStep | BuiltinStep | AggregateStep;

export type Unresolved = { readonly literal: number; readonly reason: string };

export type Plan = {
  readonly steps: ReadonlyArray<Step>;
  readonly unresolved: ReadonlyArray<Unresolved>;
  readonly bound: ReadonlySet<string>;
};

/** Assigns a slot per named variable of a rule. */
export class Slots {
  readonly #slots = new Map<string, number>();

  get size(): number {
    return this.#slots.size;
  }

  slot(name: string): number {
    let slot = this.#slots.get(name);
    if (slot === undefined) {
      slot = this.#slots.size;
      this.#slots.set(name, slot);
    }
    return slot;
  }

  ref(term: Ast.Term): Ref {
    if (term.type === 'constant') {
      return { kind: 'const', value: term.value };
    }
    return term.anonymous ? { kind: 'wild' } : { kind: 'slot', slot: this.slot(term.name) };
  }
}

const isBound = (term: Ast.Term, bound: ReadonlySet<string>) =>
  term.type === 'constant' || (!term.anonymous && bound.has(term.name));

const unboundNames = (terms: ReadonlyArray<Ast.Term>, bound: ReadonlySet<string>) =>
  terms.flatMap((term) => (term.type === 'variable' && !term.anonymous && !bound.has(term.name) ? [term.name] : []));

const variableNames = (literal: Ast.Literal): string[] => {
  switch (literal.type) {
    case 'atom':
      return literal.atom.terms.flatMap((term) => (term.type === 'variable' && !term.anonymous ? [term.name] : []));
    case 'comparison':
      return [literal.left, literal.right].flatMap((term) =>
        term.type === 'variable' && !term.anonymous ? [term.name] : [],
      );
    case 'aggregate':
      return [
        ...[literal.result, ...(literal.target ? [literal.target] : [])].flatMap((term) =>
          term.type === 'variable' && !term.anonymous ? [term.name] : [],
        ),
        ...literal.body.flatMap(variableNames),
      ];
  }
};

/**
 * Orders a rule body so every literal runs once its inputs are bound: filters as early as
 * possible, then the relation scan with the most bound columns, then generating built-ins.
 * @param outer Variables used outside the body (the head, or the enclosing rule of an aggregate).
 * @param first Literal to scan first (the semi-naive delta).
 */
export const planBody = (options: {
  body: ReadonlyArray<Ast.Literal>;
  builtins: Builtin.Registry;
  slots: Slots;
  outer: ReadonlySet<string>;
  bound?: ReadonlySet<string>;
  first?: number;
}): Plan => {
  const { body, builtins, slots, outer, first } = options;
  const bound = new Set(options.bound ?? []);
  const steps: Step[] = [];
  const remaining = new Set(body.keys());
  const unresolved: Unresolved[] = [];

  const scan = (index: number, literal: Ast.AtomLiteral) => {
    const boundColumns: { column: number; ref: Ref }[] = [];
    const binds: { column: number; slot: number }[] = [];
    literal.atom.terms.forEach((term, column) => {
      if (isBound(term, bound)) {
        boundColumns.push({ column, ref: slots.ref(term) });
      } else if (term.type === 'variable' && !term.anonymous) {
        binds.push({ column, slot: slots.slot(term.name) });
      }
    });
    for (const name of unboundNames(literal.atom.terms, bound)) {
      bound.add(name);
    }
    steps.push({ kind: 'scan', literal: index, relation: literal.atom.predicate, bound: boundColumns, binds });
  };

  /** Variables any other literal or the outer scope uses, which an aggregate must correlate on. */
  const correlated = (index: number, literal: Ast.AggregateLiteral): string[] => {
    const elsewhere = new Set([...outer, ...body.flatMap((other, at) => (at === index ? [] : variableNames(other)))]);
    const inner = new Set(literal.body.flatMap(variableNames));
    return [...inner].filter((name) => elsewhere.has(name));
  };

  /** Schedules `index` if it is a filter (or, with `generate`, a generator) whose inputs are bound. */
  const trySchedule = (index: number, generate: boolean): boolean => {
    const literal = body[index];
    switch (literal.type) {
      case 'atom': {
        const builtin = builtins.get(literal.atom.predicate);
        if (!builtin) {
          if (!literal.negated) {
            return false;
          }
          if (unboundNames(literal.atom.terms, bound).length > 0) {
            return false;
          }
          steps.push({
            kind: 'negation',
            relation: literal.atom.predicate,
            bound: literal.atom.terms.flatMap((term, column) =>
              term.type === 'variable' && term.anonymous ? [] : [{ column, ref: slots.ref(term) }],
            ),
          });
          return true;
        }
        const boundArgs = literal.atom.terms.map((term) => isBound(term, bound));
        const allBound = boundArgs.every(Boolean);
        if (!allBound && (!generate || literal.negated || !Builtin.acceptsBinding(builtin, boundArgs))) {
          return false;
        }
        steps.push({
          kind: 'builtin',
          builtin,
          args: literal.atom.terms.map((term) => slots.ref(term)),
          free: boundArgs.map((value) => !value),
          negated: literal.negated,
        });
        for (const name of unboundNames(literal.atom.terms, bound)) {
          bound.add(name);
        }
        return true;
      }
      case 'comparison': {
        const left = isBound(literal.left, bound);
        const right = isBound(literal.right, bound);
        if (left && right) {
          steps.push({
            kind: 'compare',
            operator: literal.operator,
            left: slots.ref(literal.left),
            right: slots.ref(literal.right),
          });
          return true;
        }
        if (!generate || literal.operator !== '=' || left === right) {
          return false;
        }
        const [target, source] = left ? [literal.right, literal.left] : [literal.left, literal.right];
        if (target.type !== 'variable' || target.anonymous) {
          return false;
        }
        steps.push({
          kind: 'compare',
          operator: '=',
          left: slots.ref(literal.left),
          right: slots.ref(literal.right),
          assign: { slot: slots.slot(target.name), from: slots.ref(source) },
        });
        bound.add(target.name);
        return true;
      }
      case 'aggregate': {
        const correlation = correlated(index, literal);
        if (correlation.some((name) => !bound.has(name))) {
          return false;
        }
        const resultBound = isBound(literal.result, bound);
        if (!resultBound && !generate) {
          return false;
        }
        const inner = planBody({
          body: literal.body,
          builtins,
          slots,
          outer: new Set(correlation),
          bound: new Set(correlation),
        });
        if (inner.unresolved.length > 0) {
          unresolved.push(...inner.unresolved.map(({ reason }) => ({ literal: index, reason })));
          return true;
        }
        if (literal.target && !isBound(literal.target, inner.bound)) {
          unresolved.push({ literal: index, reason: `aggregate target is not bound by the aggregate body` });
          return true;
        }
        const local = [...inner.bound].filter((name) => !correlation.includes(name)).map((name) => slots.slot(name));
        steps.push({
          kind: 'aggregate',
          function: literal.function,
          steps: inner.steps,
          local,
          target: literal.target ? slots.ref(literal.target) : undefined,
          result: slots.ref(literal.result),
          assignResult: !resultBound,
        });
        if (literal.result.type === 'variable' && !literal.result.anonymous) {
          bound.add(literal.result.name);
        }
        return true;
      }
    }
  };

  if (first !== undefined) {
    const literal = body[first];
    if (literal.type === 'atom' && !literal.negated && !builtins.has(literal.atom.predicate)) {
      remaining.delete(first);
      scan(first, literal);
    }
  }

  while (remaining.size > 0) {
    let progressed = false;
    for (const index of remaining) {
      if (trySchedule(index, false)) {
        remaining.delete(index);
        progressed = true;
      }
    }
    if (progressed) {
      continue;
    }

    let best: number | undefined;
    let bestBound = -1;
    for (const index of remaining) {
      const literal = body[index];
      if (literal.type === 'atom' && !literal.negated && !builtins.has(literal.atom.predicate)) {
        const boundCount = literal.atom.terms.filter((term) => isBound(term, bound)).length;
        if (boundCount > bestBound) {
          best = index;
          bestBound = boundCount;
        }
      }
    }
    if (best !== undefined) {
      const literal = body[best];
      if (literal.type === 'atom') {
        remaining.delete(best);
        scan(best, literal);
      }
      continue;
    }

    for (const index of remaining) {
      if (trySchedule(index, true)) {
        remaining.delete(index);
        progressed = true;
        break;
      }
    }
    if (!progressed) {
      break;
    }
  }

  for (const index of remaining) {
    unresolved.push({ literal: index, reason: describeUnresolved(body[index], bound, builtins) });
  }
  return { steps, unresolved, bound };
};

const describeUnresolved = (literal: Ast.Literal, bound: ReadonlySet<string>, builtins: Builtin.Registry): string => {
  switch (literal.type) {
    case 'atom': {
      const names = unboundNames(literal.atom.terms, bound).join(', ');
      if (builtins.has(literal.atom.predicate)) {
        return literal.negated
          ? `negated built-in ${literal.atom.predicate} needs every argument bound (${names} unbound)`
          : `no binding mode of built-in ${literal.atom.predicate}/${literal.atom.terms.length} accepts ${names} unbound`;
      }
      return `variable ${names} under negation is not bound by a positive literal`;
    }
    case 'comparison':
      return `variable ${unboundNames([literal.left, literal.right], bound).join(', ')} in comparison is not bound`;
    case 'aggregate':
      return `aggregate depends on unbound variables`;
  }
};
