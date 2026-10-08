//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ast from './Ast.ts';
import type * as Builtin from './Builtin.ts';
import * as Checker from './Checker.ts';
import { type Plan, type Ref, Slots, type Step, planBody } from './internal/plan.ts';
import { Relation, compareValues, tupleKey, valueKey } from './internal/relation.ts';
import { dependencies, stratify } from './internal/stratify.ts';

/** A tuple of a named relation. */
export type Entry = { readonly relation: string; readonly tuple: Ast.Tuple };

/** Tuples that entered or left each relation during one update. */
export type Changes = {
  readonly added: ReadonlyMap<string, ReadonlyArray<Ast.Tuple>>;
  readonly removed: ReadonlyMap<string, ReadonlyArray<Ast.Tuple>>;
};

/** One way a tuple was derived: the rule and the relation tuples its positive literals matched. */
export type Derivation = { readonly rule: number; readonly premises: ReadonlyArray<Entry> };

export type Options = {
  readonly program: Ast.Program;
  readonly builtins?: Builtin.Registry;
  /** Base relations and their arities; enables the `undefined` check. */
  readonly relations?: Readonly<Record<string, number>>;
  /** Record one derivation per derived tuple (default true). */
  readonly provenance?: boolean;
};

export type Update = {
  readonly insert?: Iterable<Entry>;
  readonly retract?: Iterable<Entry>;
  /** Re-evaluate rules that use volatile built-ins (a clock tick). */
  readonly refresh?: boolean;
};

type CompiledRule = {
  readonly index: number;
  readonly relation: string;
  readonly head: ReadonlyArray<Ref>;
  readonly slots: number;
  readonly naive: ReadonlyArray<Step>;
  /** Plans that scan the given positive literal first, for semi-naive deltas. */
  readonly delta: ReadonlyMap<number, { readonly relation: string; readonly steps: ReadonlyArray<Step> }>;
  readonly generatorOnly: boolean;
};

type CompiledStratum = {
  readonly predicates: ReadonlySet<string>;
  readonly rules: ReadonlyArray<CompiledRule>;
  readonly positive: ReadonlySet<string>;
  readonly nonMonotone: ReadonlySet<string>;
  readonly volatile: boolean;
};

type Accumulator = { added: Map<string, Ast.Tuple[]>; removed: Map<string, Ast.Tuple[]> };

/**
 * Stratified semi-naive evaluator that keeps its model between updates: insertions propagate
 * incrementally, and a stratum is recomputed (and diffed) only when something it reads
 * non-monotonically changed.
 */
export class Engine {
  readonly #builtins: Builtin.Registry;
  readonly #provenance: boolean;
  readonly #strata: ReadonlyArray<CompiledStratum>;
  readonly #idb: ReadonlySet<string>;
  readonly #arities = new Map<string, number>();
  readonly #relations = new Map<string, Relation>();
  readonly #base = new Map<string, Relation>();
  readonly #derivations = new Map<string, Map<string, Derivation>>();

  /** @throws Checker.CheckError if the program has diagnostics. */
  constructor(options: Options) {
    this.#builtins = options.builtins ?? new Map();
    this.#provenance = options.provenance ?? true;
    const diagnostics = Checker.check(options.program, { builtins: this.#builtins, relations: options.relations });
    if (diagnostics.length > 0) {
      throw new Checker.CheckError(diagnostics);
    }
    const stratification = stratify(options.program.rules, this.#builtins);
    if (!stratification.ok) {
      throw new Error('Unreachable: checked programs are stratifiable.');
    }

    for (const [name, arity] of Object.entries(options.relations ?? {})) {
      this.#arities.set(name, arity);
    }
    const rules = options.program.rules;
    const visit = (literal: Ast.Literal) => {
      if (literal.type === 'atom' && !this.#builtins.has(literal.atom.predicate)) {
        this.#arities.set(literal.atom.predicate, literal.atom.terms.length);
      } else if (literal.type === 'aggregate') {
        literal.body.forEach(visit);
      }
    };
    for (const rule of rules) {
      this.#arities.set(rule.head.predicate, rule.head.terms.length);
      rule.body.forEach(visit);
    }
    this.#idb = new Set(stratification.strata.flatMap((stratum) => [...stratum.predicates]));
    this.#strata = stratification.strata.map((stratum) => {
      const compiled = stratum.rules.map((index) => this.#compileRule(index, rules[index]));
      const positive = new Set<string>();
      const nonMonotone = new Set<string>();
      for (const index of stratum.rules) {
        for (const literal of rules[index].body) {
          for (const dependency of dependencies(literal, this.#builtins)) {
            if (!stratum.predicates.has(dependency.predicate)) {
              (dependency.negative ? nonMonotone : positive).add(dependency.predicate);
            }
          }
        }
      }
      return {
        predicates: stratum.predicates,
        rules: compiled,
        positive,
        nonMonotone,
        volatile: stratum.rules.some((index) => rules[index].body.some((literal) => this.#isVolatile(literal))),
      };
    });

    const accumulator: Accumulator = { added: new Map(), removed: new Map() };
    for (const rule of rules.filter((rule) => rule.body.length === 0)) {
      const tuple = rule.head.terms.flatMap((term) => (term.type === 'constant' ? [term.value] : []));
      this.#addBase(rule.head.predicate, tuple, accumulator);
    }
    for (const stratum of this.#strata) {
      this.#recompute(stratum, accumulator);
    }
  }

  /** Applies retractions, then insertions, then propagates; returns what changed. */
  update(update: Update): Changes {
    const accumulator: Accumulator = { added: new Map(), removed: new Map() };
    const dirty = new Set<string>();
    for (const { relation, tuple } of update.retract ?? []) {
      const key = tupleKey(tuple);
      if (this.#base.get(relation)?.delete(key)) {
        if (this.#idb.has(relation)) {
          dirty.add(relation);
        } else if (this.#relation(relation).delete(key)) {
          push(accumulator.removed, relation, tuple);
        }
      }
    }
    for (const { relation, tuple } of update.insert ?? []) {
      if (this.#addBase(relation, tuple, accumulator) && this.#idb.has(relation)) {
        dirty.add(relation);
      }
    }

    for (const stratum of this.#strata) {
      const changed = (relation: string) =>
        (accumulator.added.get(relation)?.length ?? 0) + (accumulator.removed.get(relation)?.length ?? 0) > 0;
      const full =
        (update.refresh && stratum.volatile) ||
        [...stratum.predicates].some((predicate) => dirty.has(predicate)) ||
        [...stratum.nonMonotone].some(changed) ||
        [...stratum.positive].some((relation) => (accumulator.removed.get(relation)?.length ?? 0) > 0);
      if (full) {
        this.#recompute(stratum, accumulator);
      } else {
        this.#propagate(stratum, accumulator);
      }
    }
    return accumulator;
  }

  /** Inserts tuples into one relation. */
  insert(relation: string, ...tuples: ReadonlyArray<Ast.Tuple>): Changes {
    return this.update({ insert: tuples.map((tuple) => ({ relation, tuple })) });
  }

  /** Tuples of `relation`, optionally restricted to those matching the defined positions of `pattern`. */
  query(relation: string, pattern: ReadonlyArray<Ast.Value | undefined> = []): Ast.Tuple[] {
    const columns: number[] = [];
    const values: Ast.Value[] = [];
    pattern.forEach((value, column) => {
      if (value !== undefined) {
        columns.push(column);
        values.push(value);
      }
    });
    return [...(this.#relations.get(relation)?.lookup(columns, values) ?? [])];
  }

  has(relation: string, tuple: Ast.Tuple): boolean {
    return this.#relations.get(relation)?.has(tupleKey(tuple)) ?? false;
  }

  /** The recorded derivation of a tuple; undefined for base tuples and absent ones. */
  derivation(relation: string, tuple: Ast.Tuple): Derivation | undefined {
    return this.#derivations.get(relation)?.get(tupleKey(tuple));
  }

  /** The base tuples one derivation of `tuple` rests on (the tuple itself if it is a base tuple). */
  provenance(relation: string, tuple: Ast.Tuple): Entry[] {
    const result: Entry[] = [];
    const visited = new Set<string>();
    const visit = (entry: Entry) => {
      const key = `${entry.relation}\u0002${tupleKey(entry.tuple)}`;
      if (visited.has(key)) {
        return;
      }
      visited.add(key);
      const derivation = this.derivation(entry.relation, entry.tuple);
      if (derivation) {
        derivation.premises.forEach(visit);
      } else if (this.#base.get(entry.relation)?.has(tupleKey(entry.tuple))) {
        result.push(entry);
      }
    };
    if (this.has(relation, tuple)) {
      visit({ relation, tuple });
    }
    return result;
  }

  #compileRule(index: number, rule: Ast.Rule): CompiledRule {
    const slots = new Slots();
    const outer = new Set(Ast.variablesOf(rule.head.terms));
    const naive = planBody({ body: rule.body, builtins: this.#builtins, slots, outer });
    const delta = new Map<number, { relation: string; steps: ReadonlyArray<Step> }>();
    rule.body.forEach((literal, literalIndex) => {
      if (literal.type === 'atom' && !literal.negated && !this.#builtins.has(literal.atom.predicate)) {
        const plan: Plan = planBody({ body: rule.body, builtins: this.#builtins, slots, outer, first: literalIndex });
        delta.set(literalIndex, { relation: literal.atom.predicate, steps: plan.steps });
      }
    });
    return {
      index,
      relation: rule.head.predicate,
      head: rule.head.terms.map((term) => slots.ref(term)),
      slots: slots.size,
      naive: naive.steps,
      delta,
      generatorOnly: delta.size === 0,
    };
  }

  #isVolatile(literal: Ast.Literal): boolean {
    switch (literal.type) {
      case 'atom':
        return this.#builtins.get(literal.atom.predicate)?.volatile === true;
      case 'comparison':
        return false;
      case 'aggregate':
        return literal.body.some((inner) => this.#isVolatile(inner));
    }
  }

  #relation(name: string): Relation {
    let relation = this.#relations.get(name);
    if (!relation) {
      relation = new Relation();
      this.#relations.set(name, relation);
    }
    return relation;
  }

  #addBase(relation: string, tuple: Ast.Tuple, accumulator: Accumulator): boolean {
    const arity = this.#arities.get(relation);
    if (arity === undefined) {
      this.#arities.set(relation, tuple.length);
    } else if (arity !== tuple.length) {
      throw new Error(`Arity mismatch: ${relation}/${tuple.length} inserted where ${relation}/${arity} is expected`);
    }
    let base = this.#base.get(relation);
    if (!base) {
      base = new Relation();
      this.#base.set(relation, base);
    }
    const key = tupleKey(tuple);
    if (!base.add(tuple, key)) {
      return false;
    }
    if (!this.#idb.has(relation) && this.#relation(relation).add(tuple, key)) {
      push(accumulator.added, relation, tuple);
    }
    return true;
  }

  /** Re-derives a stratum from scratch and records the difference from its previous contents. */
  #recompute(stratum: CompiledStratum, accumulator: Accumulator) {
    const previous = new Map<string, Relation>();
    for (const predicate of stratum.predicates) {
      previous.set(predicate, this.#relation(predicate));
      const fresh = new Relation();
      for (const [key, tuple] of this.#base.get(predicate)?.entries() ?? []) {
        fresh.add(tuple, key);
      }
      this.#relations.set(predicate, fresh);
      this.#derivations.delete(predicate);
    }

    const delta = this.#commit(
      stratum.rules.flatMap((rule) => this.#run(rule, rule.naive)),
      undefined,
    );
    this.#iterate(stratum, delta);

    for (const predicate of stratum.predicates) {
      const before = previous.get(predicate) ?? new Relation();
      const after = this.#relation(predicate);
      for (const [key, tuple] of after.entries()) {
        if (!before.has(key)) {
          push(accumulator.added, predicate, tuple);
        }
      }
      for (const [key, tuple] of before.entries()) {
        if (!after.has(key)) {
          push(accumulator.removed, predicate, tuple);
        }
      }
    }
  }

  /** Semi-naive propagation of tuples added to relations below the stratum. */
  #propagate(stratum: CompiledStratum, accumulator: Accumulator) {
    const derived: Emitted[] = [];
    for (const rule of stratum.rules) {
      if (rule.generatorOnly) {
        derived.push(...this.#run(rule, rule.naive));
        continue;
      }
      for (const { relation, steps } of rule.delta.values()) {
        const tuples = accumulator.added.get(relation);
        if (tuples && tuples.length > 0 && !stratum.predicates.has(relation)) {
          derived.push(...this.#run(rule, steps, tuples));
        }
      }
    }
    const delta = this.#commit(derived, accumulator);
    this.#iterate(stratum, delta, accumulator);
  }

  /** Runs recursive rules of the stratum to fixpoint from `delta`. */
  #iterate(stratum: CompiledStratum, initial: Map<string, Ast.Tuple[]>, accumulator?: Accumulator) {
    let delta = initial;
    while (delta.size > 0) {
      const derived: Emitted[] = [];
      for (const rule of stratum.rules) {
        for (const { relation, steps } of rule.delta.values()) {
          const tuples = delta.get(relation);
          if (tuples && stratum.predicates.has(relation)) {
            derived.push(...this.#run(rule, steps, tuples));
          }
        }
      }
      delta = this.#commit(derived, accumulator);
    }
  }

  /** Adds derived tuples; returns the new ones by relation. */
  #commit(derived: ReadonlyArray<Emitted>, accumulator: Accumulator | undefined): Map<string, Ast.Tuple[]> {
    const delta = new Map<string, Ast.Tuple[]>();
    for (const { relation, tuple, derivation } of derived) {
      const key = tupleKey(tuple);
      if (this.#relation(relation).add(tuple, key)) {
        push(delta, relation, tuple);
        if (accumulator) {
          push(accumulator.added, relation, tuple);
        }
        if (derivation) {
          let derivations = this.#derivations.get(relation);
          if (!derivations) {
            derivations = new Map();
            this.#derivations.set(relation, derivations);
          }
          derivations.set(key, derivation);
        }
      }
    }
    return delta;
  }

  /** Evaluates a rule plan; when `delta` is given, the plan's first scan reads it instead of the relation. */
  #run(rule: CompiledRule, steps: ReadonlyArray<Step>, delta?: ReadonlyArray<Ast.Tuple>): Emitted[] {
    const emitted: Emitted[] = [];
    const binding: Array<Ast.Value | undefined> = new Array(rule.slots).fill(undefined);
    const premises: Entry[] = [];
    this.#solve(steps, 0, binding, premises, delta, () => {
      const tuple = rule.head.map((ref) => resolveBound(ref, binding));
      emitted.push({
        relation: rule.relation,
        tuple,
        derivation: this.#provenance ? { rule: rule.index, premises: [...premises] } : undefined,
      });
    });
    return emitted;
  }

  #solve(
    steps: ReadonlyArray<Step>,
    position: number,
    binding: Array<Ast.Value | undefined>,
    premises: Entry[],
    delta: ReadonlyArray<Ast.Tuple> | undefined,
    emit: () => void,
  ): void {
    if (position === steps.length) {
      emit();
      return;
    }
    const step = steps[position];
    const next = () => this.#solve(steps, position + 1, binding, premises, delta, emit);
    switch (step.kind) {
      case 'scan': {
        const values = step.bound.map(({ ref }) => resolveBound(ref, binding));
        const tuples =
          position === 0 && delta
            ? delta.filter((tuple) => step.bound.every(({ column }, at) => tuple[column] === values[at]))
            : this.#relation(step.relation).lookup(
                step.bound.map(({ column }) => column),
                values,
              );
        for (const tuple of tuples) {
          const assigned: number[] = [];
          let matches = true;
          for (const { column, slot } of step.binds) {
            const current = binding[slot];
            if (current === undefined) {
              binding[slot] = tuple[column];
              assigned.push(slot);
            } else if (current !== tuple[column]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            premises.push({ relation: step.relation, tuple });
            next();
            premises.pop();
          }
          for (const slot of assigned) {
            binding[slot] = undefined;
          }
        }
        return;
      }
      case 'negation': {
        const matches = this.#relation(step.relation).lookup(
          step.bound.map(({ column }) => column),
          step.bound.map(({ ref }) => resolveBound(ref, binding)),
        );
        if (isEmpty(matches)) {
          next();
        }
        return;
      }
      case 'compare': {
        if (step.assign) {
          binding[step.assign.slot] = resolve(step.assign.from, binding);
          next();
          binding[step.assign.slot] = undefined;
          return;
        }
        const left = resolve(step.left, binding);
        const right = resolve(step.right, binding);
        if (left !== undefined && right !== undefined && compare(step.operator, left, right)) {
          next();
        }
        return;
      }
      case 'builtin': {
        const args = step.args.map((ref, index) => (step.free[index] ? undefined : resolve(ref, binding)));
        const results = step.builtin.evaluate(args);
        if (step.negated) {
          if (isEmpty(results)) {
            next();
          }
          return;
        }
        for (const result of results) {
          if (result.length !== step.args.length) {
            continue;
          }
          const assigned: number[] = [];
          let matches = true;
          for (let index = 0; index < step.args.length && matches; index++) {
            const ref = step.args[index];
            if (ref.kind === 'wild') {
              continue;
            }
            if (ref.kind === 'slot' && binding[ref.slot] === undefined) {
              binding[ref.slot] = result[index];
              assigned.push(ref.slot);
            } else {
              matches = resolve(ref, binding) === result[index];
            }
          }
          if (matches) {
            next();
          }
          for (const slot of assigned) {
            binding[slot] = undefined;
          }
        }
        return;
      }
      case 'aggregate': {
        const seen = new Set<string>();
        const targets: Ast.Value[] = [];
        const matched: Entry[] = [];
        this.#solve(step.steps, 0, binding, matched, undefined, () => {
          // Matched tuples join the key so anonymous columns still count as distinct rows.
          const key = [
            ...step.local.map((slot) => valueKey(resolveBound({ kind: 'slot', slot }, binding))),
            ...matched.map(({ relation, tuple }) => `${relation}\u0002${tupleKey(tuple)}`),
          ].join('\u0001');
          if (!seen.has(key)) {
            seen.add(key);
            const target = step.target ? resolve(step.target, binding) : undefined;
            if (target !== undefined) {
              targets.push(target);
            }
          }
        });
        const value = aggregate(step.function, seen.size, targets);
        if (value === undefined) {
          return;
        }
        if (step.assignResult && step.result.kind === 'slot') {
          binding[step.result.slot] = value;
          next();
          binding[step.result.slot] = undefined;
        } else if (step.result.kind === 'wild' || resolve(step.result, binding) === value) {
          next();
        }
      }
    }
  }
}

/** Creates an engine and evaluates the program's facts. */
export const make = (options: Options): Engine => new Engine(options);

type Emitted = { readonly relation: string; readonly tuple: Ast.Tuple; readonly derivation?: Derivation };

const push = (map: Map<string, Ast.Tuple[]>, relation: string, tuple: Ast.Tuple) => {
  const list = map.get(relation);
  if (list) {
    list.push(tuple);
  } else {
    map.set(relation, [tuple]);
  }
};

const resolve = (ref: Ref, binding: ReadonlyArray<Ast.Value | undefined>): Ast.Value | undefined => {
  switch (ref.kind) {
    case 'const':
      return ref.value;
    case 'slot':
      return binding[ref.slot];
    case 'wild':
      return undefined;
  }
};

/** Planned steps only read slots an earlier step bound. */
const resolveBound = (ref: Ref, binding: ReadonlyArray<Ast.Value | undefined>): Ast.Value => {
  const value = resolve(ref, binding);
  if (value === undefined) {
    throw new Error('Unbound variable in planned step.');
  }
  return value;
};

const isEmpty = (iterable: Iterable<unknown>): boolean => iterable[Symbol.iterator]().next().done === true;

const compare = (operator: Ast.ComparisonOperator, left: Ast.Value, right: Ast.Value): boolean => {
  switch (operator) {
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    case '<':
      return compareValues(left, right) < 0;
    case '<=':
      return compareValues(left, right) <= 0;
    case '>':
      return compareValues(left, right) > 0;
    case '>=':
      return compareValues(left, right) >= 0;
  }
};

const aggregate = (
  fn: Ast.AggregateFunction,
  count: number,
  targets: ReadonlyArray<Ast.Value>,
): Ast.Value | undefined => {
  switch (fn) {
    case 'count':
      return count;
    case 'sum':
      return targets.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : Number(value)), 0);
    case 'min':
      return targets.length === 0
        ? undefined
        : targets.reduce((min, value) => (compareValues(value, min) < 0 ? value : min));
    case 'max':
      return targets.length === 0
        ? undefined
        : targets.reduce((max, value) => (compareValues(value, max) > 0 ? value : max));
  }
};
