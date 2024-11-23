//
// Copyright 2024 DXOS.org
//

import { createRequire } from 'node:module';
import type { Parjser } from 'parjs';

import type {
  CypherQuery,
  EqualsPredicate,
  GraphPattern,
  GraphPatternConnector,
  Identifier,
  MatchClause,
  MemberExpression,
  NodePattern,
  Properties,
  Property,
  RelationshipPattern,
  ReturnClause,
  StringLiteral,
  WhereClause,
} from './ast';

// TODO(dmaretskyi): Must be like this or it breaks vitest.
const require = createRequire(import.meta.url);
const { string, regexp, whitespace } = require('parjs') as typeof import('parjs');
const { between, many, manySepBy, or, map, then, thenq, recover } =
  require('parjs/combinators') as typeof import('parjs/combinators');

// import type { NodePattern, Properties, Property, RelationshipPattern } from './ast';
// import { between, manySepBy, map, or, type Parjser, recover, regexp, string, then, whitespace } from './parjs';

// Helper parsers
const ws = whitespace(); // Parses whitespace

const nothing = string('').pipe(map(() => null)); // Parses nothing

const optional = <T>(parser: Parjser<T>) =>
  parser.pipe(
    recover(() => ({ kind: 'Soft' })),
    or(nothing),
  ); // Makes a parser optional

const keyword = (word: string) => string(word).pipe(map(() => word)); // Parses specific keywords

// Identifiers (node labels, relationship types, variables, etc.)
export const identifier = regexp(/[a-zA-Z_][a-zA-Z0-9_]*/).pipe(
  map((match): Identifier => ({ astKind: 'Identifier', name: match[0] })), // Extract the matched string
);

// Literals (numbers and strings)
const numberLiteral = regexp(/-?\d+(\.\d+)?/).pipe(map(Number)); // Numbers
const stringLiteral = regexp(/"([^"]*)"|'([^']*)'/).pipe(
  map((match): StringLiteral => ({ astKind: 'StringLiteral', value: match[1] || match[2] })), // Extract content without quotes
);

// Node pattern (e.g., "(n:Person {name: 'John'})"
const variableTag = identifier.pipe(map((variable) => variable)).expects('variable tag');
export const label = identifier.pipe(map((name) => name));
export const property = identifier.pipe(
  then(string(':'), ws, stringLiteral),
  map(([key, , , value]): Property => ({ key, value })),
);
export const properties = property.pipe(
  manySepBy(','),
  between('{', '}'),
  map((properties): Properties => ({ astKind: 'Properties', properties })),
);
export const nodePattern = optional(variableTag).pipe(
  then(':'),
  then(ws, label, ws),
  then(optional(properties)),
  between('(', ')'),
  map(([[[variable], _, label], properties]): NodePattern => ({ astKind: 'NodePattern', variable, label, properties })),
);

export const relationshipPattern = optional(variableTag).pipe(
  then(':'),
  then(ws, label, ws),
  then(optional(properties)),
  between('[', ']'),
  map(
    ([[[variable], _, label], properties]): RelationshipPattern => ({
      astKind: 'RelationshipPattern',
      variable,
      label,
      properties,
    }),
  ),
);

const graphPatternConnector = string('->').pipe(
  or('<-' as const, '-' as const),
  map((x): GraphPatternConnector => ({ astKind: 'GraphPatternConnector', direction: x })),
);

export const graphPattern = nodePattern.pipe(
  or(relationshipPattern),
  manySepBy(graphPatternConnector),
  map((segments): GraphPattern => ({ astKind: 'GraphPattern', segments })),
);

export const matchClause = keyword('MATCH').pipe(
  thenq(ws),
  then(graphPattern),
  map(([, pattern]): MatchClause => ({ astKind: 'MatchClause', pattern })),
);

const memberExpression = identifier.pipe(
  manySepBy('.'),
  map((path): MemberExpression => ({ astKind: 'MemberExpression', path })),
);

const equalsPredicate = memberExpression.pipe(
  then(ws, string('='), ws, stringLiteral),
  map(([left, , , , right]): EqualsPredicate => ({ astKind: 'EqualsPredicate', left, right })),
);

export const whereClause = keyword('WHERE').pipe(
  then(ws, equalsPredicate.pipe(between(ws, ws), manySepBy(string('AND'))), ws),
  map(([, , predicates]): WhereClause => ({ astKind: 'WhereClause', predicates })),
);

export const returnClause = keyword('RETURN').pipe(
  then(
    ws,
    memberExpression.pipe(
      then(optional(string('AS').pipe(between(ws), then(identifier))), ws),
      manySepBy(string(',').pipe(then(ws))),
    ),
    ws,
  ),
  map(([, , fields]): ReturnClause => ({ astKind: 'ReturnClause', fields: fields.map(([f]) => f) })),
);

export const cypherQuery = ws.pipe(
  then(matchClause, ws, optional(whereClause), ws, returnClause, ws),
  map(
    ([, matchClause, , whereClause, , returnClause]): CypherQuery => ({
      astKind: 'CypherQuery',
      matchClause,
      whereClause,
      returnClause,
    }),
  ),
);
