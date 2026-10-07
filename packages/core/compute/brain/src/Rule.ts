//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/** A ground value a Datalog term can take. */
export type Value = string | number | boolean;

export type Variable = { readonly _tag: 'variable'; readonly name: string };

export type Constant = { readonly _tag: 'constant'; readonly value: Value };

export type Term = Variable | Constant;

/** `count(V)` in a rule head: the number of distinct values of `V` per group of the other head terms. */
export type Count = { readonly _tag: 'count'; readonly variable: string };

export type HeadTerm = Term | Count;

export type Atom = { readonly predicate: string; readonly args: readonly Term[] };

export type Head = { readonly predicate: string; readonly args: readonly HeadTerm[] };

/** A ground atom: a tuple of a relation. */
export type GroundAtom = { readonly predicate: string; readonly args: readonly Value[] };

export const BUILTINS = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'about', 'elapsed'] as const;

export type BuiltinName = (typeof BUILTINS)[number];

const BUILTIN_SET: ReadonlySet<string> = new Set(BUILTINS);

export const isBuiltin = (name: string): name is BuiltinName => BUILTIN_SET.has(name);

export type Literal =
  | { readonly _tag: 'positive'; readonly atom: Atom }
  | { readonly _tag: 'negative'; readonly atom: Atom }
  | { readonly _tag: 'builtin'; readonly name: BuiltinName; readonly args: readonly Term[] };

export type Rule = { readonly head: Head; readonly body: readonly Literal[] };

/** An integrity constraint: violated whenever its body holds. */
export type Constraint = { readonly name: string; readonly body: readonly Literal[] };

export type Program = { readonly rules: readonly Rule[]; readonly constraints: readonly Constraint[] };

/** The rule text could not be parsed. */
export class ParseError extends BaseError.extend('ParseError', 'Rule text could not be parsed.') {}

/** A rule is unsafe, misuses a predicate's arity, or defines a reserved predicate. */
export class InvalidRuleError extends BaseError.extend('InvalidRuleError', 'Rule is invalid.') {}

/** The program recurses through negation or aggregation, so it has no stratified model. */
export class StratificationError extends BaseError.extend('StratificationError', 'Program is not stratifiable.') {}

/** Milliseconds per duration suffix, so time rules read as `elapsed(T, 2d)`. */
const DURATIONS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

type Token =
  | { readonly kind: 'ident'; readonly text: string; readonly offset: number }
  | { readonly kind: 'string'; readonly text: string; readonly offset: number }
  | { readonly kind: 'number'; readonly value: number; readonly offset: number }
  | { readonly kind: 'punct'; readonly text: string; readonly offset: number };

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < source.length) {
    const char = source[offset];
    if (/\s/.test(char)) {
      offset++;
    } else if (char === '%') {
      while (offset < source.length && source[offset] !== '\n') {
        offset++;
      }
    } else if (source.startsWith(':-', offset)) {
      tokens.push({ kind: 'punct', text: ':-', offset });
      offset += 2;
    } else if ('(),.!'.includes(char)) {
      tokens.push({ kind: 'punct', text: char, offset });
      offset++;
    } else if (char === '"') {
      let text = '';
      let cursor = offset + 1;
      while (cursor < source.length && source[cursor] !== '"') {
        if (source[cursor] === '\\' && cursor + 1 < source.length) {
          cursor++;
        }
        text += source[cursor];
        cursor++;
      }
      if (cursor >= source.length) {
        throw new ParseError({ message: 'Unterminated string.', context: { offset } });
      }
      tokens.push({ kind: 'string', text, offset });
      offset = cursor + 1;
    } else {
      const number = /^-?\d+(\.\d+)?(ms|s|m|h|d|w)?(?![A-Za-z0-9_])/.exec(source.slice(offset));
      const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(offset));
      if (number) {
        const unit = number[2];
        const magnitude = Number.parseFloat(unit ? number[0].slice(0, -unit.length) : number[0]);
        tokens.push({ kind: 'number', value: unit ? magnitude * DURATIONS[unit] : magnitude, offset });
        offset += number[0].length;
      } else if (ident) {
        tokens.push({ kind: 'ident', text: ident[0], offset });
        offset += ident[0].length;
      } else {
        throw new ParseError({ message: `Unexpected character "${char}".`, context: { offset } });
      }
    }
  }
  return tokens;
};

const isVariableName = (name: string) => /^[A-Z_]/.test(name);

/** Anonymous variables (`_`) get names no rule can spell, so each occurrence is distinct. */
export const isAnonymous = (name: string): boolean => name.startsWith('_#');

class Parser {
  readonly #tokens: Token[];
  #position = 0;
  #anonymous = 0;
  #constraints = 0;

  constructor(source: string) {
    this.#tokens = tokenize(source);
  }

  program(): Program {
    const rules: Rule[] = [];
    const constraints: Constraint[] = [];
    while (!this.#done()) {
      if (this.#accept('!')) {
        const name = this.#expectIdent();
        this.#expect(':-');
        constraints.push({ name, body: this.body() });
      } else if (this.#accept(':-')) {
        constraints.push({ name: `constraint${++this.#constraints}`, body: this.body() });
      } else {
        const head = this.#head();
        rules.push({ head, body: this.#accept(':-') ? this.body() : [] });
      }
      this.#expect('.');
    }
    return { rules, constraints };
  }

  body(): Literal[] {
    const literals = [this.#literal()];
    while (this.#accept(',')) {
      literals.push(this.#literal());
    }
    return literals;
  }

  end(): void {
    this.#accept('.');
    if (!this.#done()) {
      throw this.#error('Unexpected trailing input.');
    }
  }

  #head(): Head {
    const predicate = this.#expectIdent();
    if (isVariableName(predicate)) {
      throw this.#error(`Predicate "${predicate}" must start with a lowercase letter.`);
    }
    const args: HeadTerm[] = [];
    if (this.#accept('(')) {
      do {
        const next = this.#peek();
        const following = this.#tokens[this.#position + 1];
        if (next?.kind === 'ident' && next.text === 'count' && following?.kind === 'punct' && following.text === '(') {
          this.#position += 2;
          const variable = this.#expectIdent();
          if (!isVariableName(variable) || variable === '_') {
            throw this.#error('count() takes a named variable.');
          }
          this.#expect(')');
          args.push({ _tag: 'count', variable });
        } else {
          args.push(this.#term());
        }
      } while (this.#accept(','));
      this.#expect(')');
    }
    return { predicate, args };
  }

  #literal(): Literal {
    const negated = this.#peekIdent('not') && this.#tokens[this.#position + 1]?.kind === 'ident';
    if (negated) {
      this.#position++;
    }
    const atom = this.#atom();
    if (isBuiltin(atom.predicate)) {
      if (negated) {
        throw this.#error(`Built-in "${atom.predicate}" cannot be negated.`);
      }
      return { _tag: 'builtin', name: atom.predicate, args: atom.args };
    }
    return { _tag: negated ? 'negative' : 'positive', atom };
  }

  #atom(): Atom {
    const predicate = this.#expectIdent();
    if (isVariableName(predicate)) {
      throw this.#error(`Predicate "${predicate}" must start with a lowercase letter.`);
    }
    const args: Term[] = [];
    if (this.#accept('(')) {
      do {
        args.push(this.#term());
      } while (this.#accept(','));
      this.#expect(')');
    }
    return { predicate, args };
  }

  #term(): Term {
    const token = this.#next();
    switch (token.kind) {
      case 'string':
        return { _tag: 'constant', value: token.text };
      case 'number':
        return { _tag: 'constant', value: token.value };
      case 'ident':
        if (token.text === '_') {
          return { _tag: 'variable', name: `_#${++this.#anonymous}` };
        }
        if (isVariableName(token.text)) {
          return { _tag: 'variable', name: token.text };
        }
        if (token.text === 'true' || token.text === 'false') {
          return { _tag: 'constant', value: token.text === 'true' };
        }
        return { _tag: 'constant', value: token.text };
      default:
        throw this.#error(`Expected a term, found "${token.text}".`, token);
    }
  }

  #done() {
    return this.#position >= this.#tokens.length;
  }

  #peek(): Token | undefined {
    return this.#tokens[this.#position];
  }

  #peekIdent(text: string) {
    const token = this.#peek();
    return token?.kind === 'ident' && token.text === text;
  }

  #next(): Token {
    const token = this.#peek();
    if (!token) {
      throw this.#error('Unexpected end of input.');
    }
    this.#position++;
    return token;
  }

  #accept(punct: string): boolean {
    const token = this.#peek();
    if (token?.kind === 'punct' && token.text === punct) {
      this.#position++;
      return true;
    }
    return false;
  }

  #expect(punct: string): void {
    if (!this.#accept(punct)) {
      throw this.#error(`Expected "${punct}".`);
    }
  }

  #expectIdent(): string {
    const token = this.#next();
    if (token.kind !== 'ident') {
      throw this.#error('Expected an identifier.', token);
    }
    return token.text;
  }

  #error(message: string, token = this.#peek()) {
    return new ParseError({ message, context: { offset: token?.offset ?? -1 } });
  }
}

const run = <A>(evaluate: () => A): Effect.Effect<A, ParseError> =>
  Effect.try({
    try: evaluate,
    catch: (error) => (error instanceof ParseError ? error : new ParseError({ cause: error })),
  });

/**
 * Parses Datalog text: `head :- body.` rules, `head.` facts, and `! name :- body.` (or `:- body.`) constraints.
 * Variables start with an uppercase letter or `_`; durations such as `2d` are milliseconds; `%` starts a comment.
 */
export const parse = (source: string): Effect.Effect<Program, ParseError> => run(() => new Parser(source).program());

/** Parses a conjunctive query such as `wake(G, R), not achieved(G)`. */
export const parseQuery = (source: string): Effect.Effect<Literal[], ParseError> =>
  run(() => {
    const parser = new Parser(source);
    const body = parser.body();
    parser.end();
    return body;
  });

const formatValue = (value: Value): string =>
  typeof value === 'string' ? (/^[a-z][A-Za-z0-9_]*$/.test(value) ? value : JSON.stringify(value)) : String(value);

const formatTerm = (term: HeadTerm): string => {
  switch (term._tag) {
    case 'variable':
      return isAnonymous(term.name) ? '_' : term.name;
    case 'constant':
      return formatValue(term.value);
    case 'count':
      return `count(${term.variable})`;
  }
};

const formatArgs = (args: readonly HeadTerm[]) => (args.length > 0 ? `(${args.map(formatTerm).join(', ')})` : '');

const formatLiteral = (literal: Literal): string => {
  switch (literal._tag) {
    case 'positive':
      return `${literal.atom.predicate}${formatArgs(literal.atom.args)}`;
    case 'negative':
      return `not ${literal.atom.predicate}${formatArgs(literal.atom.args)}`;
    case 'builtin':
      return `${literal.name}${formatArgs(literal.args)}`;
  }
};

/** A rule back in Datalog notation, for display and provenance. */
export const format = (rule: Rule): string => {
  const head = `${rule.head.predicate}${formatArgs(rule.head.args)}`;
  return rule.body.length > 0 ? `${head} :- ${rule.body.map(formatLiteral).join(', ')}.` : `${head}.`;
};

/** A ground atom in Datalog notation, e.g. `wake(goal3, reply)`. */
export const formatAtom = (atom: GroundAtom): string =>
  `${atom.predicate}${atom.args.length > 0 ? `(${atom.args.map(formatValue).join(', ')})` : ''}`;
