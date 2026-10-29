//
// Copyright 2026 DXOS.org
//

import { type Row, type Term, XSD } from '../../terms.ts';
import { type ResultSet } from './results.ts';

const INTEGER_TYPES = new Set(
  [
    'integer',
    'long',
    'int',
    'short',
    'byte',
    'nonNegativeInteger',
    'positiveInteger',
    'negativeInteger',
    'nonPositiveInteger',
    'unsignedLong',
    'unsignedInt',
    'unsignedShort',
    'unsignedByte',
  ].map((name) => `${XSD}${name}`),
);
const FLOAT_TYPES = new Set([`${XSD}decimal`, `${XSD}double`, `${XSD}float`]);

/**
 * Canonical key of a term for result comparison: RDF term equality, except that numeric literals of
 * the same datatype compare by value (`"1.0"^^xsd:decimal` = `"1"^^xsd:decimal`, `"1E0"` = `"1.0e0"`)
 * and language tags case-insensitively, as both are equal-by-value forms the spec does not pin down.
 * The datatype itself must match: `"2"^^xsd:integer` is not `"2.0"^^xsd:decimal`.
 */
export const termKey = (term: Term | undefined): string => {
  if (!term) {
    return '';
  }
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal': {
      if (term.language) {
        return `"${term.value}"@${term.language.toLowerCase()}`;
      }
      const datatype = term.datatype ?? `${XSD}string`;
      return `"${canonicalNumber(term.value, datatype) ?? term.value}"^^${datatype}`;
    }
  }
};

const canonicalNumber = (value: string, datatype: string): string | undefined => {
  const trimmed = value.trim();
  if (INTEGER_TYPES.has(datatype) && /^[+-]?\d+$/.test(trimmed)) {
    return BigInt(trimmed).toString();
  }
  if (FLOAT_TYPES.has(datatype) && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
    // 15 significant digits: double-based engines (this one included) cannot be compared beyond that.
    return String(Number(Number(trimmed).toPrecision(15)));
  }
  return undefined;
};

const isBlank = (term: Term | undefined) => term?.termType === 'BlankNode';

/** Row key with blank nodes erased: two isomorphic rows have equal shapes. */
const shape = (row: Row, vars: string[]) =>
  vars.map((name) => (isBlank(row[name]) ? '_' : termKey(row[name]))).join('\u0001');

const SEARCH_BUDGET = 1_000_000;

/**
 * True when `actual` equals `expected` as a multiset of rows under some bijection of blank nodes
 * (SPARQL result-set equivalence; graph isomorphism when the rows are triples).
 */
export const isomorphic = (expected: Row[], actual: Row[], vars: string[]): boolean => {
  if (expected.length !== actual.length) {
    return false;
  }
  const groups = new Map<string, number>();
  for (const row of expected) {
    const key = shape(row, vars);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  for (const row of actual) {
    const key = shape(row, vars);
    const count = groups.get(key);
    if (!count) {
      return false;
    }
    groups.set(key, count - 1);
  }
  const hasBlank = (row: Row) => vars.some((name) => isBlank(row[name]));
  const pending = expected.filter(hasBlank);
  if (pending.length === 0) {
    return true;
  }
  // Rows with blank nodes: backtracking search for a consistent bijection, most constrained rows first.
  const candidates = actual.filter(hasBlank);
  const byShape = new Map<string, Row[]>();
  for (const row of candidates) {
    const key = shape(row, vars);
    byShape.set(key, [...(byShape.get(key) ?? []), row]);
  }
  pending.sort(
    (left, right) => (byShape.get(shape(left, vars))?.length ?? 0) - (byShape.get(shape(right, vars))?.length ?? 0),
  );
  const forward = new Map<string, string>();
  const backward = new Map<string, string>();
  const used = new Set<Row>();
  let steps = 0;
  const search = (index: number): boolean => {
    if (index === pending.length) {
      return true;
    }
    if (++steps > SEARCH_BUDGET) {
      throw new Error('blank node isomorphism search exceeded its budget');
    }
    const row = pending[index];
    for (const candidate of byShape.get(shape(row, vars)) ?? []) {
      if (used.has(candidate)) {
        continue;
      }
      const added: string[] = [];
      let consistent = true;
      for (const name of vars) {
        const left = row[name];
        const right = candidate[name];
        if (!left || !right || left.termType !== 'BlankNode' || right.termType !== 'BlankNode') {
          continue;
        }
        const mapped = forward.get(left.value);
        if (mapped === undefined) {
          if (backward.has(right.value)) {
            consistent = false;
            break;
          }
          forward.set(left.value, right.value);
          backward.set(right.value, left.value);
          added.push(left.value);
        } else if (mapped !== right.value) {
          consistent = false;
          break;
        }
      }
      if (consistent) {
        used.add(candidate);
        if (search(index + 1)) {
          return true;
        }
        used.delete(candidate);
      }
      for (const name of added) {
        const target = forward.get(name);
        forward.delete(name);
        if (target !== undefined) {
          backward.delete(target);
        }
      }
    }
    return false;
  };
  return search(0);
};

const describeRows = (rows: Row[], vars: string[]) =>
  rows
    .slice(0, 20)
    .map((row) => `  { ${vars.map((name) => `${name}=${termKey(row[name]) || '\u2205'}`).join(' ')} }`)
    .join('\n') + (rows.length > 20 ? `\n  \u2026 ${rows.length - 20} more` : '');

const dedupe = (rows: Row[], vars = ['s', 'p', 'o']): Row[] => {
  const seen = new Map<string, Row>();
  for (const row of rows) {
    seen.set(vars.map((name) => termKey(row[name])).join(' '), row);
  }
  return [...seen.values()];
};

export type CompareOptions = {
  /** REDUCED: any cardinality between the distinct and the full answer is allowed, so compare distinct rows. */
  reduced?: boolean;
  /** The query has ORDER BY: rows must also appear in the expected order of these keys. */
  orderBy?: { vars: string[] } | 'rows';
};

/** Compares two answers; returns a human-readable difference, or undefined when they are equivalent. */
export const compareResults = (expected: ResultSet, actual: ResultSet, options: CompareOptions = {}) => {
  if (expected.kind !== actual.kind) {
    return `expected a ${expected.kind} result, got ${actual.kind}`;
  }
  if (expected.kind === 'boolean' && actual.kind === 'boolean') {
    return expected.value === actual.value ? undefined : `expected ${expected.value}, got ${actual.value}`;
  }
  if (expected.kind === 'graph' && actual.kind === 'graph') {
    const [left, right] = [dedupe(expected.triples), dedupe(actual.triples)];
    return isomorphic(left, right, ['s', 'p', 'o'])
      ? undefined
      : `graphs differ\nexpected:\n${describeRows(left, ['s', 'p', 'o'])}\nactual:\n${describeRows(right, ['s', 'p', 'o'])}`;
  }
  if (expected.kind !== 'bindings' || actual.kind !== 'bindings') {
    return 'unreachable';
  }
  const vars = [
    ...new Set([...expected.vars, ...expected.rows.flatMap(Object.keys), ...actual.rows.flatMap(Object.keys)]),
  ];
  const mismatch = `expected:\n${describeRows(expected.rows, vars)}\nactual:\n${describeRows(actual.rows, vars)}`;
  if (options.reduced) {
    return isomorphic(dedupe(expected.rows, vars), dedupe(actual.rows, vars), vars)
      ? undefined
      : `distinct solutions differ\n${mismatch}`;
  }
  if (!isomorphic(expected.rows, actual.rows, vars)) {
    return `solutions differ (${expected.rows.length} expected, ${actual.rows.length} actual)\n${mismatch}`;
  }
  if (options.orderBy) {
    const keyVars = options.orderBy === 'rows' ? vars : options.orderBy.vars;
    const sequence = (rows: Row[]) => rows.map((row) => shape(row, keyVars));
    const [left, right] = [sequence(expected.rows), sequence(actual.rows)];
    if (left.some((key, index) => key !== right[index])) {
      return `solutions are in a different order\n${mismatch}`;
    }
  }
  return undefined;
};
