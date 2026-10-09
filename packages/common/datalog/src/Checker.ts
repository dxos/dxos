//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

import * as Ast from './Ast.ts';
import type * as Builtin from './Builtin.ts';
import { Slots, planBody } from './internal/plan.ts';
import { stratify } from './internal/stratify.ts';

export type DiagnosticCode = 'arity' | 'builtin-head' | 'undefined' | 'unsafe' | 'unstratifiable';

/** A static error in a program. */
export type Diagnostic = {
  readonly code: DiagnosticCode;
  readonly message: string;
  /** Index of the offending rule. */
  readonly rule?: number;
  readonly position?: Ast.Position;
};

export type Options = {
  readonly builtins?: Builtin.Registry;
  /**
   * Base relations and their arities. When given, a body predicate that is neither defined by a
   * rule, declared here nor a built-in is reported as `undefined`.
   */
  readonly relations?: Readonly<Record<string, number>>;
};

/** Thrown when a program with diagnostics is evaluated. */
export class CheckError extends BaseError.extend('CheckError', 'Invalid program') {
  // A typed field rather than `context`, which would repeat every diagnostic in the message as JSON.
  readonly diagnostics: ReadonlyArray<Diagnostic>;

  constructor(diagnostics: ReadonlyArray<Diagnostic>) {
    super({ message: `Invalid program:\n${diagnostics.map(formatDiagnostic).join('\n')}` });
    this.diagnostics = diagnostics;
  }
}

/** Formats a diagnostic as `line:column code: message`. */
export const formatDiagnostic = (diagnostic: Diagnostic): string => {
  const at = diagnostic.position ? `${diagnostic.position.line}:${diagnostic.position.column} ` : '';
  return `${at}${diagnostic.code}: ${diagnostic.message}`;
};

/**
 * Checks arity consistency, built-in heads, undefined predicates, range restriction (safety) and
 * stratification; an empty result means the program can be evaluated.
 */
export const check = (program: Ast.Program, options: Options = {}): Diagnostic[] => {
  const builtins = options.builtins ?? new Map();
  const diagnostics: Diagnostic[] = [];
  const arities = new Map<string, number>();
  for (const builtin of builtins.values()) {
    arities.set(builtin.name, builtin.arity);
  }
  for (const [name, arity] of Object.entries(options.relations ?? {})) {
    arities.set(name, arity);
  }
  const defined = new Set(program.rules.map((rule) => rule.head.predicate));

  const visitAtom = (atom: Ast.Atom, rule: number, position: Ast.Position | undefined) => {
    const expected = arities.get(atom.predicate);
    if (expected === undefined) {
      arities.set(atom.predicate, atom.terms.length);
    } else if (expected !== atom.terms.length) {
      diagnostics.push({
        code: 'arity',
        message: `${atom.predicate}/${atom.terms.length} used where ${atom.predicate}/${expected} is expected`,
        rule,
        position,
      });
    }
  };
  const visitLiteral = (literal: Ast.Literal, rule: number, fallback: Ast.Position | undefined) => {
    const position = literal.position ?? fallback;
    if (literal.type === 'atom') {
      visitAtom(literal.atom, rule, position);
      const predicate = literal.atom.predicate;
      if (
        options.relations &&
        !defined.has(predicate) &&
        !builtins.has(predicate) &&
        !(predicate in options.relations)
      ) {
        diagnostics.push({
          code: 'undefined',
          message: `${predicate}/${literal.atom.terms.length} is not a relation, rule or built-in`,
          rule,
          position,
        });
      }
    } else if (literal.type === 'aggregate') {
      literal.body.forEach((inner) => visitLiteral(inner, rule, position));
    }
  };

  program.rules.forEach((rule, index) => {
    if (builtins.has(rule.head.predicate)) {
      diagnostics.push({
        code: 'builtin-head',
        message: `rule defines built-in ${rule.head.predicate}`,
        rule: index,
        position: rule.position,
      });
    }
    visitAtom(rule.head, index, rule.position);
    rule.body.forEach((literal) => visitLiteral(literal, index, rule.position));

    const head = new Set(Ast.variablesOf(rule.head.terms));
    const plan = planBody({ body: rule.body, builtins, slots: new Slots(), outer: head });
    for (const { literal, reason } of plan.unresolved) {
      diagnostics.push({
        code: 'unsafe',
        message: `${reason} in: ${Ast.formatRule(rule)}`,
        rule: index,
        position: rule.body[literal].position ?? rule.position,
      });
    }
    const unboundHead = [...head].filter((name) => !plan.bound.has(name));
    if (unboundHead.length > 0) {
      diagnostics.push({
        code: 'unsafe',
        message: `head variable ${unboundHead.join(', ')} is not bound by the body in: ${Ast.formatRule(rule)}`,
        rule: index,
        position: rule.position,
      });
    }
    if (rule.head.terms.some((term) => term.type === 'variable' && term.anonymous)) {
      diagnostics.push({
        code: 'unsafe',
        message: `anonymous variable in head of: ${Ast.formatRule(rule)}`,
        rule: index,
        position: rule.position,
      });
    }
  });

  const stratification = stratify(program.rules, builtins);
  if (!stratification.ok) {
    for (const cycle of stratification.cycles) {
      diagnostics.push({
        code: 'unstratifiable',
        message: `negation or aggregation through recursion among: ${cycle.join(', ')}`,
        rule: program.rules.findIndex((rule) => cycle.includes(rule.head.predicate)),
        position: program.rules.find((rule) => cycle.includes(rule.head.predicate))?.position,
      });
    }
  }
  return diagnostics;
};
