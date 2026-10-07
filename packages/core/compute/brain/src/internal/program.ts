//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Rule from '../Rule.ts';

/** The relations every active fact projects into; rules read them but never define them. */
export const EDB_ARITY: ReadonlyMap<string, number> = new Map([
  ['fact', 4],
  ['polarity', 2],
  ['force', 2],
  ['speaker', 2],
  ['source', 2],
  ['said_at', 2],
  ['confidence', 2],
  ['factuality', 2],
]);

export type Step =
  | { readonly _tag: 'scan'; readonly atom: Rule.Atom; readonly index: number }
  | { readonly _tag: 'negate'; readonly atom: Rule.Atom }
  | { readonly _tag: 'builtin'; readonly name: Rule.BuiltinName; readonly args: readonly Rule.Term[] };

export type CompiledRule = {
  readonly id: string;
  readonly text: string;
  readonly head: Rule.Head;
  readonly positives: readonly Rule.Atom[];
  readonly steps: readonly Step[];
  readonly stratum: number;
  readonly aggregate: boolean;
};

export type ViolationMode = 'reject' | 'flag';

export type CompiledConstraint = {
  readonly name: string;
  readonly mode: ViolationMode;
  readonly steps: readonly Step[];
};

export type CompiledProgram = {
  /** Ordered by stratum, then by ruleset and position, so evaluation order is deterministic. */
  readonly rules: readonly CompiledRule[];
  readonly strata: number;
  readonly constraints: readonly CompiledConstraint[];
  /** For each predicate, the predicates whose rules read it. */
  readonly dependents: ReadonlyMap<string, ReadonlySet<string>>;
  /** Predicates read under negation or by an aggregate, so adding tuples to them can remove conclusions. */
  readonly nonMonotone: ReadonlySet<string>;
  /** Some rule or constraint reads the clock, so its conclusions change as time passes. */
  readonly temporal: boolean;
};

export type RulesetSpec = {
  readonly id: string;
  readonly program: Rule.Program;
  readonly onViolation: ViolationMode;
};

export const EMPTY_PROGRAM: CompiledProgram = {
  rules: [],
  strata: 0,
  constraints: [],
  dependents: new Map(),
  nonMonotone: new Set(),
  temporal: false,
};

const variablesOf = (terms: readonly Rule.HeadTerm[]): string[] =>
  terms.flatMap((term) => (term._tag === 'variable' ? [term.name] : term._tag === 'count' ? [term.variable] : []));

const namedVariablesOf = (terms: readonly Rule.Term[]): string[] =>
  variablesOf(terms).filter((name) => !Rule.isAnonymous(name));

const invalid = (message: string, context: Record<string, unknown>): Effect.Effect<never, Rule.InvalidRuleError> =>
  Effect.fail(new Rule.InvalidRuleError({ message, context }));

/**
 * Orders a body for evaluation: positive atoms in the order written, each negation or built-in as soon as its
 * variables are bound. Fails when one never is (the rule is unsafe).
 */
export const plan = (body: readonly Rule.Literal[], where: string): Effect.Effect<Step[], Rule.InvalidRuleError> => {
  const bound = new Set<string>();
  const steps: Step[] = [];
  let pending = body.flatMap((literal) => (literal._tag === 'positive' ? [] : [literal]));
  const flush = () => {
    pending = pending.filter((literal) => {
      const needed = literal._tag === 'negative' ? namedVariablesOf(literal.atom.args) : variablesOf(literal.args);
      if (!needed.every((name) => bound.has(name))) {
        return true;
      }
      steps.push(
        literal._tag === 'negative'
          ? { _tag: 'negate', atom: literal.atom }
          : { _tag: 'builtin', name: literal.name, args: literal.args },
      );
      return false;
    });
  };

  flush();
  let index = 0;
  for (const literal of body) {
    if (literal._tag === 'positive') {
      steps.push({ _tag: 'scan', atom: literal.atom, index: index++ });
      variablesOf(literal.atom.args).forEach((name) => bound.add(name));
      flush();
    }
  }

  if (pending.length > 0) {
    return invalid('A negated atom or built-in uses a variable no positive atom binds.', { where });
  }
  return Effect.succeed(steps);
};

/** Validates every ruleset together and stratifies the result; the program is all or nothing. */
export const compile = Effect.fnUntraced(function* (rulesets: readonly RulesetSpec[]) {
  const arity = new Map(EDB_ARITY);
  const checkArity = (predicate: string, count: number, where: string): Effect.Effect<void, Rule.InvalidRuleError> => {
    const known = arity.get(predicate);
    if (known !== undefined && known !== count) {
      return invalid(`Predicate "${predicate}" is used with ${count} arguments and with ${known}.`, { where });
    }
    if (Rule.isBuiltin(predicate) && count !== 2) {
      return invalid(`Built-in "${predicate}" takes 2 arguments.`, { where });
    }
    arity.set(predicate, count);
    return Effect.void;
  };

  const rules: Omit<CompiledRule, 'stratum'>[] = [];
  const constraints: CompiledConstraint[] = [];
  let temporal = false;
  for (const ruleset of rulesets) {
    for (const [position, rule] of ruleset.program.rules.entries()) {
      const id = `${ruleset.id}#${position + 1}`;
      const { head, body } = rule;
      if (EDB_ARITY.has(head.predicate) || Rule.isBuiltin(head.predicate)) {
        return yield* invalid(`Predicate "${head.predicate}" is reserved.`, { rule: id });
      }
      yield* checkArity(head.predicate, head.args.length, id);
      for (const literal of body) {
        yield* literal._tag === 'builtin'
          ? checkArity(literal.name, literal.args.length, id)
          : checkArity(literal.atom.predicate, literal.atom.args.length, id);
      }

      const counts = head.args.filter((term) => term._tag === 'count');
      if (counts.length > 1) {
        return yield* invalid('A head counts at most one variable.', { rule: id });
      }
      const positiveVariables = new Set(
        body.flatMap((literal) => (literal._tag === 'positive' ? variablesOf(literal.atom.args) : [])),
      );
      const headVariables = variablesOf(head.args);
      if (headVariables.some((name) => Rule.isAnonymous(name) || !positiveVariables.has(name))) {
        return yield* invalid('Every head variable must appear in a positive body atom.', { rule: id });
      }

      temporal ||= body.some((literal) => literal._tag === 'builtin' && literal.name === 'elapsed');
      rules.push({
        id,
        text: Rule.format(rule),
        head,
        positives: body.flatMap((literal) => (literal._tag === 'positive' ? [literal.atom] : [])),
        steps: yield* plan(body, id),
        aggregate: counts.length > 0,
      });
    }

    for (const constraint of ruleset.program.constraints) {
      const name = constraint.anonymous === true ? `${ruleset.id}/${constraint.name}` : constraint.name;
      if (constraints.some((held) => held.name === name)) {
        return yield* invalid(`Constraint "${name}" is defined twice.`, { ruleset: ruleset.id });
      }
      for (const literal of constraint.body) {
        yield* literal._tag === 'builtin'
          ? checkArity(literal.name, literal.args.length, name)
          : checkArity(literal.atom.predicate, literal.atom.args.length, name);
      }
      temporal ||= constraint.body.some((literal) => literal._tag === 'builtin' && literal.name === 'elapsed');
      constraints.push({
        name,
        mode: ruleset.onViolation,
        steps: yield* plan(constraint.body, name),
      });
    }
  }

  // Strata: a head sits above every predicate it negates or aggregates over; a cycle through either never settles.
  const stratum = new Map<string, number>();
  const levelOf = (predicate: string) => stratum.get(predicate) ?? 0;
  const bound = arity.size + 1;
  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      let level = levelOf(rule.head.predicate);
      for (const step of rule.steps) {
        if (step._tag === 'scan') {
          level = Math.max(level, levelOf(step.atom.predicate) + (rule.aggregate ? 1 : 0));
        } else if (step._tag === 'negate') {
          level = Math.max(level, levelOf(step.atom.predicate) + 1);
        }
      }
      if (level > levelOf(rule.head.predicate)) {
        if (level > bound) {
          return yield* Effect.fail(
            new Rule.StratificationError({ context: { rule: rule.id, predicate: rule.head.predicate } }),
          );
        }
        stratum.set(rule.head.predicate, level);
        changed = true;
      }
    }
  }

  const dependents = new Map<string, Set<string>>();
  const nonMonotone = new Set<string>();
  for (const rule of rules) {
    for (const step of rule.steps) {
      if (step._tag === 'scan' || step._tag === 'negate') {
        const readers = dependents.get(step.atom.predicate) ?? new Set<string>();
        readers.add(rule.head.predicate);
        dependents.set(step.atom.predicate, readers);
        if (step._tag === 'negate' || rule.aggregate) {
          nonMonotone.add(step.atom.predicate);
        }
      }
    }
  }

  const compiled = rules
    .map((rule, order) => ({ rule: { ...rule, stratum: levelOf(rule.head.predicate) }, order }))
    .sort((left, right) => left.rule.stratum - right.rule.stratum || left.order - right.order)
    .map(({ rule }) => rule);

  const program: CompiledProgram = {
    rules: compiled,
    strata: compiled.reduce((max, rule) => Math.max(max, rule.stratum + 1), 0),
    constraints,
    dependents,
    nonMonotone,
    temporal,
  };
  return program;
});

/** The predicates whose tuples can change when tuples of `changed` do. */
export const downstream = (program: CompiledProgram, changed: Iterable<string>): Set<string> => {
  const reached = new Set<string>(changed);
  const queue = [...reached];
  while (queue.length > 0) {
    const predicate = queue.shift();
    for (const reader of (predicate !== undefined && program.dependents.get(predicate)) || []) {
      if (!reached.has(reader)) {
        reached.add(reader);
        queue.push(reader);
      }
    }
  }
  return reached;
};
