//
// Copyright 2024 DXOS.org
//

/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

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
import { Parjser, parjs, parjsCombinators } from './parjs';

// Helper parsers
const ws = parjs.whitespace(); // Parses whitespace.

const nothing = parjs.string('').pipe(parjsCombinators.map(() => null)); // Parses nothing.

const optional = <T>(parser: Parjser<T>) =>
  parser.pipe(
    parjsCombinators.recover(() => ({ kind: 'Soft' })),
    parjsCombinators.or(nothing),
  ); // Makes a parser optional

const keyword = (word: string) => parjs.string(word).pipe(parjsCombinators.map(() => word)); // Parses specific keywords.

// Identifiers (node labels, relationship types, variables, etc.)
export const identifier = parjs.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/).pipe(
  parjsCombinators.map((match): Identifier => ({ astKind: 'Identifier', name: match[0] })), // Extract the matched string.
);

// Literals (numbers and strings).
const numberLiteral = parjs.regexp(/-?\d+(\.\d+)?/).pipe(parjsCombinators.map(Number)); // Numbers.
const stringLiteral = parjs.regexp(/"([^"]*)"|'([^']*)'/).pipe(
  parjsCombinators.map((match): StringLiteral => ({ astKind: 'StringLiteral', value: match[1] || match[2] })), // Extract content without quotes.
);

// Node pattern (e.g., "(n:Person {name: 'Alice'})"
const variableTag = identifier.pipe(parjsCombinators.map((variable) => variable)).expects('variable tag');
export const label = identifier.pipe(parjsCombinators.map((name) => name));
export const property = identifier.pipe(
  parjsCombinators.then(parjs.string(':'), ws, stringLiteral),
  parjsCombinators.map(([key, , , value]): Property => ({ key, value })),
);
export const properties = property.pipe(
  parjsCombinators.manySepBy(','),
  parjsCombinators.between('{', '}'),
  parjsCombinators.map((properties): Properties => ({ astKind: 'Properties', properties })),
);
export const nodePattern = optional(variableTag).pipe(
  parjsCombinators.then(':'),
  parjsCombinators.then(ws, label, ws),
  parjsCombinators.then(optional(properties)),
  parjsCombinators.between('(', ')'),
  parjsCombinators.map(
    ([[[variable], _, label], properties]): NodePattern => ({ astKind: 'NodePattern', variable, label, properties }),
  ),
);

export const relationshipPattern = optional(variableTag).pipe(
  parjsCombinators.then(':'),
  parjsCombinators.then(ws, label, ws),
  parjsCombinators.then(optional(properties)),
  parjsCombinators.between('[', ']'),
  parjsCombinators.map(
    ([[[variable], _, label], properties]): RelationshipPattern => ({
      astKind: 'RelationshipPattern',
      variable,
      label,
      properties,
    }),
  ),
);

const graphPatternConnector = parjs.string('->').pipe(
  parjsCombinators.or('<-' as const, '-' as const),
  parjsCombinators.map((x): GraphPatternConnector => ({ astKind: 'GraphPatternConnector', direction: x })),
);

export const graphPattern = nodePattern.pipe(
  parjsCombinators.or(relationshipPattern),
  parjsCombinators.manySepBy(graphPatternConnector),
  parjsCombinators.map((segments): GraphPattern => ({ astKind: 'GraphPattern', segments })),
);

export const matchClause = keyword('MATCH').pipe(
  parjsCombinators.then(ws),
  parjsCombinators.then(graphPattern),
  parjsCombinators.map(([, pattern]): MatchClause => ({ astKind: 'MatchClause', pattern })),
);

const memberExpression = identifier.pipe(
  parjsCombinators.manySepBy('.'),
  parjsCombinators.map((path): MemberExpression => ({ astKind: 'MemberExpression', path })),
);

const equalsPredicate = memberExpression.pipe(
  parjsCombinators.then(ws, parjs.string('='), ws, stringLiteral),
  parjsCombinators.map(([left, , , , right]): EqualsPredicate => ({ astKind: 'EqualsPredicate', left, right })),
);

export const whereClause = keyword('WHERE').pipe(
  parjsCombinators.then(
    ws,
    equalsPredicate.pipe(parjsCombinators.between(ws, ws), parjsCombinators.manySepBy(parjs.string('AND'))),
    ws,
  ),
  parjsCombinators.map(([, , predicates]): WhereClause => ({ astKind: 'WhereClause', predicates })),
);

export const returnClause = keyword('RETURN').pipe(
  parjsCombinators.then(
    ws,
    memberExpression.pipe(
      parjsCombinators.then(
        optional(parjs.string('AS').pipe(parjsCombinators.between(ws), parjsCombinators.then(identifier))),
        ws,
      ),
      parjsCombinators.manySepBy(parjs.string(',').pipe(parjsCombinators.then(ws))),
    ),
    ws,
  ),
  parjsCombinators.map(([, , fields]): ReturnClause => ({ astKind: 'ReturnClause', fields: fields.map(([f]) => f) })),
);

export const cypherQuery = ws.pipe(
  parjsCombinators.then(matchClause, ws, optional(whereClause), ws, returnClause, ws),
  parjsCombinators.map(
    ([, matchClause, , whereClause, , returnClause]): CypherQuery => ({
      astKind: 'CypherQuery',
      matchClause,
      whereClause,
      returnClause,
    }),
  ),
);
