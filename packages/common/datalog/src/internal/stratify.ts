//
// Copyright 2026 DXOS.org
//

import type * as Ast from '../Ast.ts';
import type * as Builtin from '../Builtin.ts';

export type Dependency = { readonly predicate: string; readonly negative: boolean };

export type Stratum = {
  /** Predicates defined by the stratum's rules (one strongly connected component). */
  readonly predicates: ReadonlySet<string>;
  /** Indexes into the program's rules. */
  readonly rules: ReadonlyArray<number>;
  readonly recursive: boolean;
};

export type Stratification =
  | { readonly ok: true; readonly strata: ReadonlyArray<Stratum> }
  | { readonly ok: false; readonly cycles: ReadonlyArray<ReadonlyArray<string>> };

/** Relations a literal reads; negation and aggregation read them non-monotonically. */
export const dependencies = (literal: Ast.Literal, builtins: Builtin.Registry): Dependency[] => {
  switch (literal.type) {
    case 'atom':
      return builtins.has(literal.atom.predicate)
        ? []
        : [{ predicate: literal.atom.predicate, negative: literal.negated }];
    case 'comparison':
      return [];
    case 'aggregate':
      return literal.body.flatMap((inner) =>
        dependencies(inner, builtins).map(({ predicate }) => ({ predicate, negative: true })),
      );
  }
};

/**
 * Splits rules into strata: one per strongly connected component of the predicate graph, in
 * dependency order; fails when negation or aggregation occurs inside a component.
 */
export const stratify = (rules: ReadonlyArray<Ast.Rule>, builtins: Builtin.Registry): Stratification => {
  const defined = new Set(rules.filter((rule) => rule.body.length > 0).map((rule) => rule.head.predicate));
  const edges = new Map<string, Dependency[]>();
  for (const predicate of defined) {
    edges.set(predicate, []);
  }
  for (const rule of rules) {
    for (const literal of rule.body) {
      for (const dependency of dependencies(literal, builtins)) {
        if (defined.has(dependency.predicate)) {
          edges.get(rule.head.predicate)?.push(dependency);
        }
      }
    }
  }

  // Tarjan's algorithm emits each component after every component it depends on.
  const components: string[][] = [];
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const visit = (predicate: string) => {
    index.set(predicate, index.size);
    lowLink.set(predicate, index.get(predicate) ?? 0);
    stack.push(predicate);
    onStack.add(predicate);
    for (const { predicate: next } of edges.get(predicate) ?? []) {
      if (!index.has(next)) {
        visit(next);
        lowLink.set(predicate, Math.min(lowLink.get(predicate) ?? 0, lowLink.get(next) ?? 0));
      } else if (onStack.has(next)) {
        lowLink.set(predicate, Math.min(lowLink.get(predicate) ?? 0, index.get(next) ?? 0));
      }
    }
    if (lowLink.get(predicate) === index.get(predicate)) {
      const component: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member !== undefined) {
          onStack.delete(member);
          component.push(member);
        }
      } while (member !== undefined && member !== predicate);
      components.push(component);
    }
  };
  for (const predicate of defined) {
    if (!index.has(predicate)) {
      visit(predicate);
    }
  }

  const cycles: string[][] = [];
  const strata: Stratum[] = components.map((component) => {
    const members = new Set(component);
    const internal = component.flatMap((predicate) =>
      (edges.get(predicate) ?? []).filter((dependency) => members.has(dependency.predicate)),
    );
    if (internal.some((dependency) => dependency.negative)) {
      cycles.push(component.sort());
    }
    return {
      predicates: members,
      rules: rules.flatMap((rule, ruleIndex) =>
        rule.body.length > 0 && members.has(rule.head.predicate) ? [ruleIndex] : [],
      ),
      recursive: internal.length > 0,
    };
  });
  return cycles.length > 0 ? { ok: false, cycles } : { ok: true, strata };
};
