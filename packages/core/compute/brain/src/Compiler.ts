//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ast from '@dxos/datalog/Ast';
import type * as Builtin from '@dxos/datalog/Builtin';
import * as Checker from '@dxos/datalog/Checker';
import * as Parser from '@dxos/datalog/Parser';
import { BaseError } from '@dxos/errors';

import * as Builtins from './Builtins.ts';
import * as Encoding from './Encoding.ts';
import * as Vocabulary from './Vocabulary.ts';

/** Heads a goal program may define: `achieved(goal)`, `holds(goal)`, `wake(Label)`, `blocks(Action)`. */
export const GOAL_HEADS = ['achieved', 'holds', 'wake', 'blocks'] as const;

/** Relations goal rules may read; goal heads a program leaves undefined are empty. */
export const RELATIONS: Readonly<Record<string, number>> = {
  ...Encoding.RELATIONS,
  ...Object.fromEntries(GOAL_HEADS.map((head) => [head, 1])),
};

export type DiagnosticCode = Checker.DiagnosticCode | 'parse' | 'vocabulary' | 'goal';

export type Diagnostic = {
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly position?: Ast.Position;
};

/** A checked goal program ready for evaluation. */
export type Compilation = {
  readonly source: string;
  readonly program: Ast.Program;
  /** Per-rule wake relations (one tuple per binding) and the label each one wakes. */
  readonly wakes: ReadonlyMap<string, string>;
};

export type Options = {
  readonly vocabulary?: Vocabulary.Vocabulary;
  /** Defaults to the goal built-ins over an empty context (signatures are all checking needs). */
  readonly builtins?: Builtin.Registry;
};

/** Thrown by `compileOrThrow` and `GoalRules` when compilation reports diagnostics. */
export class CompileError extends BaseError.extend('CompileError', 'Goal rules do not compile') {
  // A typed field rather than `context`, which would repeat every diagnostic in the message as JSON.
  readonly diagnostics: ReadonlyArray<Diagnostic>;

  constructor(diagnostics: ReadonlyArray<Diagnostic>) {
    super({ message: `Goal rules do not compile:\n${diagnostics.map(formatDiagnostic).join('\n')}` });
    this.diagnostics = diagnostics;
  }
}

/** Formats a diagnostic as `line:column code: message`. */
export const formatDiagnostic = ({ code, message, position }: Diagnostic): string =>
  `${position ? `${position.line}:${position.column} ` : ''}${code}: ${message}`;

/** The vocabulary used when none is given. */
export const defaultVocabulary = (): Vocabulary.Vocabulary =>
  Vocabulary.make(Vocabulary.DEFAULT_ENTRIES, [...Object.keys(Encoding.RELATIONS), ...GOAL_HEADS]);

/**
 * Compiles goal rules: parses, expands predicate shorthand for canonical vocabulary predicates
 * (`helps_with(S, O)` → `fact(_, S, helps_with, O)`, `helps_with(F, S, O)` exposes the id),
 * checks goal heads, then runs the engine's static checks against the fact relations.
 */
export const compile = (
  source: string,
  options: Options = {},
): { compilation?: Compilation; diagnostics: Diagnostic[] } => {
  const vocabulary = options.vocabulary ?? defaultVocabulary();
  const builtins = options.builtins ?? Builtins.make(Builtins.emptyContext());

  let parsed: Ast.Program;
  try {
    parsed = Parser.parse(source);
  } catch (error) {
    if (error instanceof Parser.ParseError) {
      return { diagnostics: [{ code: 'parse', message: error.reason, position: error.position }] };
    }
    throw error;
  }

  const diagnostics: Diagnostic[] = [];
  const defined = new Set(parsed.rules.map((rule) => rule.head.predicate));
  let anonymous = 0;

  const rewriteAtom = (literal: Ast.AtomLiteral, fallback: Ast.Position | undefined): Ast.AtomLiteral => {
    const { predicate, terms } = literal.atom;
    const position = literal.position ?? fallback;
    if (predicate === 'fact') {
      const stored = terms[2];
      if (stored?.type === 'constant') {
        const canonical = vocabulary.canonical(String(stored.value));
        if (canonical !== undefined && canonical !== stored.value) {
          diagnostics.push({
            code: 'vocabulary',
            message: `predicate "${stored.value}" is stored as ${canonical}; use ${canonical}`,
            position,
          });
        }
      }
      return literal;
    }
    if (predicate in Encoding.RELATIONS || builtins.has(predicate) || defined.has(predicate)) {
      return literal;
    }
    if (vocabulary.isCanonical(predicate)) {
      if (terms.length !== 2 && terms.length !== 3) {
        diagnostics.push({
          code: 'vocabulary',
          message: `shorthand ${predicate} takes (Subject, Object) or (Fact, Subject, Object), not ${terms.length} arguments`,
          position,
        });
        return literal;
      }
      const id: Ast.Term =
        terms.length === 3 ? terms[0] : { type: 'variable', name: `_shorthand${anonymous++}`, anonymous: true };
      const [subject, object] = terms.length === 3 ? [terms[1], terms[2]] : [terms[0], terms[1]];
      return { ...literal, atom: Ast.atom('fact', [id, subject, Ast.constant(predicate), object]) };
    }
    const canonical = vocabulary.canonical(predicate);
    if (canonical !== undefined) {
      diagnostics.push({
        code: 'vocabulary',
        message: `${predicate} is a synonym; shorthand must use the canonical predicate ${canonical}`,
        position,
      });
    }
    return literal;
  };

  const rewriteLiteral = (literal: Ast.Literal, fallback: Ast.Position | undefined): Ast.Literal => {
    switch (literal.type) {
      case 'atom':
        return rewriteAtom(literal, fallback);
      case 'comparison':
        return literal;
      case 'aggregate':
        return { ...literal, body: literal.body.map((inner) => rewriteLiteral(inner, literal.position ?? fallback)) };
    }
  };

  const rules: Ast.Rule[] = [];
  const wakes = new Map<string, string>();
  parsed.rules.forEach((parsedRule, index) => {
    const rule = {
      ...parsedRule,
      body: parsedRule.body.map((literal) => rewriteLiteral(literal, parsedRule.position)),
    };
    const { predicate, terms } = rule.head;
    if (predicate in Encoding.RELATIONS) {
      diagnostics.push({
        code: 'goal',
        message: `rules cannot define the base relation ${predicate}`,
        position: rule.position,
      });
    }
    if (isGoalHead(predicate)) {
      const [argument] = terms;
      if (terms.length !== 1) {
        diagnostics.push({ code: 'goal', message: `${predicate} takes one argument`, position: rule.position });
      } else if (predicate !== 'blocks' && argument.type !== 'constant') {
        diagnostics.push({ code: 'goal', message: `${predicate} takes a constant argument`, position: rule.position });
      } else if (
        (predicate === 'achieved' || predicate === 'holds') &&
        (argument.type !== 'constant' || argument.value !== 'goal')
      ) {
        diagnostics.push({
          code: 'goal',
          message: `${predicate} must be written ${predicate}(goal)`,
          position: rule.position,
        });
      }
    }

    const label = terms[0];
    if (predicate === 'wake' && terms.length === 1 && label.type === 'constant' && rule.body.length > 0) {
      // One relation per wake rule, carrying its body bindings, so each new binding is a new tuple.
      const relation = `wake#${index}`;
      const variables = bodyVariables(rule.body).map((name) => Ast.variable(name));
      wakes.set(relation, String(label.value));
      rules.push({ ...rule, head: Ast.atom(relation, [label, ...variables]) });
      rules.push({
        head: rule.head,
        body: [{ type: 'atom', negated: false, atom: Ast.atom(relation, [label, ...variables]) }],
        position: rule.position,
      });
    } else {
      rules.push(rule);
    }
  });

  const program: Ast.Program = { rules };
  if (diagnostics.length > 0) {
    // Engine checks would repeat each vocabulary error as an undefined predicate.
    return { diagnostics };
  }
  for (const diagnostic of Checker.check(program, { builtins, relations: RELATIONS })) {
    diagnostics.push({ code: diagnostic.code, message: diagnostic.message, position: diagnostic.position });
  }
  return diagnostics.length > 0 ? { diagnostics } : { compilation: { source, program, wakes }, diagnostics };
};

/** Compiles goal rules, throwing on any diagnostic. */
export const compileOrThrow = (source: string, options: Options = {}): Compilation => {
  const { compilation, diagnostics } = compile(source, options);
  if (!compilation) {
    throw new CompileError(diagnostics);
  }
  return compilation;
};

const isGoalHead = (predicate: string): boolean => GOAL_HEADS.some((head) => head === predicate);

/** Variables a safe body binds: those of positive literals, comparisons and aggregate results. */
const bodyVariables = (body: ReadonlyArray<Ast.Literal>): string[] => {
  const names = new Set<string>();
  for (const literal of body) {
    if (literal.type === 'atom' && !literal.negated) {
      Ast.variablesOf(literal.atom.terms).forEach((name) => names.add(name));
    } else if (literal.type === 'comparison') {
      Ast.variablesOf([literal.left, literal.right]).forEach((name) => names.add(name));
    } else if (literal.type === 'aggregate') {
      Ast.variablesOf([literal.result]).forEach((name) => names.add(name));
    }
  }
  return [...names];
};
