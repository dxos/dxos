//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** A ground value; symbols (`dima`) and strings (`"dima"`) are the same value. */
export type Value = string | number;

/** A ground row of a relation. */
export type Tuple = ReadonlyArray<Value>;

/** Source location (1-based line and column). */
export type Position = { readonly line: number; readonly column: number };

export type Variable = {
  readonly type: 'variable';
  readonly name: string;
  /** Set for `_`; each occurrence is a distinct, never-joined variable. */
  readonly anonymous?: boolean;
};

export type Constant = { readonly type: 'constant'; readonly value: Value };

export type Term = Variable | Constant;

export type Atom = { readonly predicate: string; readonly terms: ReadonlyArray<Term> };

export type ComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';

export type AggregateFunction = 'count' | 'min' | 'max' | 'sum';

export type AtomLiteral = {
  readonly type: 'atom';
  readonly atom: Atom;
  readonly negated: boolean;
  readonly position?: Position;
};

export type ComparisonLiteral = {
  readonly type: 'comparison';
  readonly operator: ComparisonOperator;
  readonly left: Term;
  readonly right: Term;
  readonly position?: Position;
};

/** `Result = fn Target : { body }`; `Target` is absent for `count`. */
export type AggregateLiteral = {
  readonly type: 'aggregate';
  readonly function: AggregateFunction;
  readonly result: Term;
  readonly target?: Term;
  readonly body: ReadonlyArray<Literal>;
  readonly position?: Position;
};

export type Literal = AtomLiteral | ComparisonLiteral | AggregateLiteral;

/** A rule; a fact is a rule with an empty body. */
export type Rule = {
  readonly head: Atom;
  readonly body: ReadonlyArray<Literal>;
  readonly position?: Position;
};

export type Program = { readonly rules: ReadonlyArray<Rule> };

/** Creates a variable term. */
export const variable = (name: string): Variable => ({ type: 'variable', name });

/** Creates a constant term. */
export const constant = (value: Value): Constant => ({ type: 'constant', value });

/** Creates an atom. */
export const atom = (predicate: string, terms: ReadonlyArray<Term>): Atom => ({ predicate, terms });

/** Named (non-anonymous) variables of a term list, in order of first occurrence. */
export const variablesOf = (terms: ReadonlyArray<Term>): string[] => {
  const names: string[] = [];
  for (const term of terms) {
    if (term.type === 'variable' && !term.anonymous && !names.includes(term.name)) {
      names.push(term.name);
    }
  }
  return names;
};

/** Named variables a literal mentions, including those inside an aggregate body. */
export const literalVariables = (literal: Literal): string[] => {
  switch (literal.type) {
    case 'atom':
      return variablesOf(literal.atom.terms);
    case 'comparison':
      return variablesOf([literal.left, literal.right]);
    case 'aggregate': {
      const terms = [literal.result, ...(literal.target ? [literal.target] : [])];
      return [...new Set([...variablesOf(terms), ...literal.body.flatMap(literalVariables)])];
    }
  }
};

/** Formats a value as dialect source. */
export const formatValue = (value: Value): string =>
  typeof value === 'number' ? String(value) : /^[a-z][A-Za-z0-9_]*$/.test(value) ? value : JSON.stringify(value);

/** Formats a term as dialect source. */
export const formatTerm = (term: Term): string =>
  term.type === 'constant' ? formatValue(term.value) : term.anonymous ? '_' : term.name;

/** Formats an atom as dialect source. */
export const formatAtom = (atom: Atom): string =>
  atom.terms.length === 0 ? atom.predicate : `${atom.predicate}(${atom.terms.map(formatTerm).join(', ')})`;

/** Formats a literal as dialect source. */
export const formatLiteral = (literal: Literal): string => {
  switch (literal.type) {
    case 'atom':
      return `${literal.negated ? 'not ' : ''}${formatAtom(literal.atom)}`;
    case 'comparison':
      return `${formatTerm(literal.left)} ${literal.operator} ${formatTerm(literal.right)}`;
    case 'aggregate': {
      const target = literal.target ? ` ${formatTerm(literal.target)}` : '';
      return `${formatTerm(literal.result)} = ${literal.function}${target} : { ${literal.body.map(formatLiteral).join(', ')} }`;
    }
  }
};

/** Formats a rule as dialect source. */
export const formatRule = (rule: Rule): string =>
  rule.body.length === 0
    ? `${formatAtom(rule.head)}.`
    : `${formatAtom(rule.head)} :- ${rule.body.map(formatLiteral).join(', ')}.`;

/** Formats a program as dialect source, one rule per line. */
export const format = (program: Program): string => program.rules.map(formatRule).join('\n');
