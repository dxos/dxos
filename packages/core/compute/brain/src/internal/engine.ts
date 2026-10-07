//
// Copyright 2026 DXOS.org
//

import type * as Event from '../Event.ts';
import * as Fact from '../Fact.ts';
import * as Rule from '../Rule.ts';
import { canonicalJson } from './hash.ts';
import { type CompiledProgram, type CompiledRule, type Step } from './program.ts';

export type Tuple = { readonly args: readonly Rule.Value[]; readonly derivation: Event.Derivation };

export type Relation = Map<string, Tuple>;

/** Every relation, base and derived, plus the order tuples were added in, so diffs replay deterministically. */
export type Model = {
  readonly relations: Map<string, Relation>;
  readonly order: { readonly predicate: string; readonly key: string }[];
};

/** What evaluation reads besides the model: the clock (one reading per evaluation) and the facts by id. */
export type Context = { readonly now: number; readonly facts: ReadonlyMap<string, Fact.Fact> };

export type Binding = Readonly<Record<string, Rule.Value>>;

type Solution = { readonly binding: Binding; readonly premises: readonly Rule.GroundAtom[] };

export const keyOf = (args: readonly Rule.Value[]): string => JSON.stringify(args);

export const emptyModel = (): Model => ({ relations: new Map(), order: [] });

export const cloneModel = (model: Model): Model => ({
  relations: new Map([...model.relations].map(([predicate, relation]) => [predicate, new Map(relation)])),
  order: [...model.order],
});

export const lookup = (model: Model, atom: Rule.GroundAtom): Tuple | undefined =>
  model.relations.get(atom.predicate)?.get(keyOf(atom.args));

/** Adds a tuple unless present; true when it was new. */
export const insert = (model: Model, predicate: string, tuple: Tuple): boolean => {
  const key = keyOf(tuple.args);
  let relation = model.relations.get(predicate);
  if (!relation) {
    relation = new Map();
    model.relations.set(predicate, relation);
  }
  if (relation.has(key)) {
    return false;
  }
  relation.set(key, tuple);
  model.order.push({ predicate, key });
  return true;
};

/** The base tuples a fact contributes: `fact(Id, S, P, O)` plus one relation per attribute it carries. */
export const baseAtoms = (fact: Fact.Fact): Rule.GroundAtom[] => {
  const atoms: Rule.GroundAtom[] = [
    { predicate: 'fact', args: [fact.id, Fact.valueOf(fact.subject), fact.predicate, Fact.valueOf(fact.object)] },
    { predicate: 'polarity', args: [fact.id, fact.polarity] },
    { predicate: 'force', args: [fact.id, fact.force] },
  ];
  const saidAt = fact.saidAt === undefined ? Number.NaN : Date.parse(fact.saidAt);
  const optional: [string, Rule.Value | undefined][] = [
    ['speaker', fact.speaker],
    ['source', fact.source],
    ['said_at', Number.isNaN(saidAt) ? undefined : saidAt],
    ['confidence', fact.confidence],
    ['factuality', fact.factuality],
  ];
  for (const [predicate, value] of optional) {
    if (value !== undefined) {
      atoms.push({ predicate, args: [fact.id, value] });
    }
  }
  return atoms;
};

const resolve = (term: Rule.Term, binding: Binding): Rule.Value | undefined =>
  term._tag === 'constant' ? term.value : binding[term.name];

const unify = (terms: readonly Rule.Term[], values: readonly Rule.Value[], binding: Binding): Binding | undefined => {
  let next: Record<string, Rule.Value> | undefined;
  for (const [index, term] of terms.entries()) {
    const value = values[index];
    if (term._tag === 'constant') {
      if (term.value !== value) {
        return undefined;
      }
    } else {
      const known = next?.[term.name] ?? binding[term.name];
      if (known === undefined) {
        next ??= { ...binding };
        next[term.name] = value;
      } else if (known !== value) {
        return undefined;
      }
    }
  }
  return next ?? binding;
};

/** Orders two numbers or two strings; values of different types are never ordered. */
const ordered = (left: Rule.Value, right: Rule.Value, test: (order: number) => boolean): boolean => {
  if (typeof left === 'number' && typeof right === 'number') {
    return test(left - right);
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return test(left < right ? -1 : left > right ? 1 : 0);
  }
  return false;
};

const timeOf = (value: Rule.Value): number =>
  typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : Number.NaN;

const builtin = (name: Rule.BuiltinName, [left, right]: readonly Rule.Value[], context: Context): boolean => {
  switch (name) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'lt':
      return ordered(left, right, (order) => order < 0);
    case 'lte':
      return ordered(left, right, (order) => order <= 0);
    case 'gt':
      return ordered(left, right, (order) => order > 0);
    case 'gte':
      return ordered(left, right, (order) => order >= 0);
    case 'contains':
      return String(left).toLowerCase().includes(String(right).toLowerCase());
    case 'about': {
      const fact = typeof left === 'string' ? context.facts.get(left) : undefined;
      return fact !== undefined && Fact.mentions(fact, String(right));
    }
    case 'elapsed': {
      const since = timeOf(left);
      return !Number.isNaN(since) && typeof right === 'number' && context.now - since >= right;
    }
  }
};

const negationHolds = (atom: Rule.Atom, binding: Binding, model: Model): boolean => {
  const relation = model.relations.get(atom.predicate);
  if (!relation) {
    return true;
  }
  const pattern = atom.args.map((term) => resolve(term, binding));
  for (const tuple of relation.values()) {
    if (pattern.every((value, index) => value === undefined || value === tuple.args[index])) {
      return false;
    }
  }
  return true;
};

/**
 * Every solution of a planned body. With `delta`, the positive atom at `delta.index` ranges over the delta
 * relation instead of the model: the semi-naive step that only joins what changed.
 */
export const solve = (
  steps: readonly Step[],
  model: Model,
  context: Context,
  delta?: { readonly index: number; readonly relation: Relation },
): Solution[] => {
  const solutions: Solution[] = [];
  const visit = (position: number, binding: Binding, premises: readonly Rule.GroundAtom[]) => {
    const step = steps[position];
    if (step === undefined) {
      solutions.push({ binding, premises });
      return;
    }
    switch (step._tag) {
      case 'scan': {
        const relation =
          delta !== undefined && delta.index === step.index ? delta.relation : model.relations.get(step.atom.predicate);
        for (const tuple of relation?.values() ?? []) {
          const next = unify(step.atom.args, tuple.args, binding);
          if (next) {
            visit(position + 1, next, [...premises, { predicate: step.atom.predicate, args: tuple.args }]);
          }
        }
        return;
      }
      case 'negate':
        if (negationHolds(step.atom, binding, model)) {
          visit(position + 1, binding, premises);
        }
        return;
      case 'builtin': {
        const values = step.args.map((term) => resolve(term, binding));
        const ground = values.filter((value): value is Rule.Value => value !== undefined);
        if (ground.length === values.length && builtin(step.name, ground, context)) {
          visit(position + 1, binding, premises);
        }
        return;
      }
    }
  };
  visit(0, {}, []);
  return solutions;
};

const headValues = (rule: CompiledRule, binding: Binding): Rule.Value[] =>
  rule.head.args.map((term) => {
    switch (term._tag) {
      case 'constant':
        return term.value;
      case 'variable':
        return binding[term.name];
      case 'count':
        return 0;
    }
  });

const aggregate = (rule: CompiledRule, model: Model, context: Context): Tuple[] => {
  const countIndex = rule.head.args.findIndex((term) => term._tag === 'count');
  const counted = rule.head.args[countIndex];
  const groups = new Map<string, { args: Rule.Value[]; values: Set<string>; premises: Map<string, Rule.GroundAtom> }>();
  for (const { binding, premises } of solve(rule.steps, model, context)) {
    const args = headValues(rule, binding);
    const key = keyOf(args);
    const group = groups.get(key) ?? { args, values: new Set<string>(), premises: new Map() };
    if (counted?._tag === 'count') {
      group.values.add(keyOf([binding[counted.variable]]));
    }
    premises.forEach((premise) => group.premises.set(canonicalJson(premise), premise));
    groups.set(key, group);
  }
  return [...groups.values()].map(({ args, values, premises }) => ({
    args: args.map((value, index) => (index === countIndex ? values.size : value)),
    derivation: { _tag: 'rule', rule: rule.id, premises: [...premises.values()] },
  }));
};

/**
 * Semi-naive evaluation, stratum by stratum: each round joins only against the tuples the previous round added.
 * `seed` holds the tuples already in the model that are new to it — every base tuple for a full evaluation,
 * just the pushed ones for an incremental one. Returns the number of tuples derived.
 */
export const extend = (
  program: CompiledProgram,
  model: Model,
  seed: ReadonlyMap<string, Relation>,
  context: Context,
): number => {
  const changed = new Map([...seed].map(([predicate, relation]) => [predicate, new Map(relation)]));
  let derived = 0;
  for (let stratum = 0; stratum < program.strata; stratum++) {
    const rules = program.rules.filter((rule) => rule.stratum === stratum);
    let delta: ReadonlyMap<string, Relation> = changed;
    let first = true;
    while (true) {
      const added = new Map<string, Relation>();
      const offer = (rule: CompiledRule, tuple: Tuple) => {
        const key = keyOf(tuple.args);
        const relation = added.get(rule.head.predicate) ?? new Map<string, Tuple>();
        if (!model.relations.get(rule.head.predicate)?.has(key) && !relation.has(key)) {
          relation.set(key, tuple);
          added.set(rule.head.predicate, relation);
        }
      };
      const fire = (rule: CompiledRule, solutions: Solution[]) => {
        for (const { binding, premises } of solutions) {
          offer(rule, { args: headValues(rule, binding), derivation: { _tag: 'rule', rule: rule.id, premises } });
        }
      };

      for (const rule of rules) {
        if (rule.aggregate) {
          if (first) {
            aggregate(rule, model, context).forEach((tuple) => offer(rule, tuple));
          }
        } else if (rule.positives.length === 0) {
          if (first) {
            fire(rule, solve(rule.steps, model, context));
          }
        } else {
          for (const [index, atom] of rule.positives.entries()) {
            const relation = delta.get(atom.predicate);
            if (relation && relation.size > 0) {
              fire(rule, solve(rule.steps, model, context, { index, relation }));
            }
          }
        }
      }

      if (added.size === 0) {
        break;
      }
      for (const [predicate, relation] of added) {
        const accumulated = changed.get(predicate) ?? new Map<string, Tuple>();
        for (const [key, tuple] of relation) {
          insert(model, predicate, tuple);
          accumulated.set(key, tuple);
          derived++;
        }
        changed.set(predicate, accumulated);
      }
      delta = added;
      first = false;
    }
  }
  return derived;
};

/** The named-variable bindings under which each constraint's body holds. */
export const findViolations = (
  program: CompiledProgram,
  model: Model,
  context: Context,
): Map<string, { readonly constraint: string; readonly mode: 'reject' | 'flag'; readonly bindings: Binding }> => {
  const found = new Map<string, { constraint: string; mode: 'reject' | 'flag'; bindings: Binding }>();
  for (const constraint of program.constraints) {
    for (const { binding } of solve(constraint.steps, model, context)) {
      const bindings = named(binding);
      found.set(`${constraint.name}:${canonicalJson(bindings)}`, {
        constraint: constraint.name,
        mode: constraint.mode,
        bindings,
      });
    }
  }
  return found;
};

/** Drops anonymous variables, which no caller can name. */
export const named = (binding: Binding): Binding =>
  Object.fromEntries(Object.entries(binding).filter(([name]) => !Rule.isAnonymous(name)));
