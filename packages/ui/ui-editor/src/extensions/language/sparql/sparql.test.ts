//
// Copyright 2026 DXOS.org
//

import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';
import { describe, test } from 'vitest';

import { sparqlLanguage } from './sparql.ts';

/** Class names per standard tag, so a token's colour is asserted by the tag the editor's theme would style. */
const highlighter = tagHighlighter([
  { tag: tags.keyword, class: 'keyword' },
  { tag: tags.url, class: 'iri' },
  { tag: tags.namespace, class: 'prefix' },
  { tag: tags.propertyName, class: 'name' },
  { tag: tags.string, class: 'string' },
  { tag: tags.number, class: 'number' },
  { tag: tags.punctuation, class: 'terminator' },
  { tag: tags.separator, class: 'separator' },
  { tag: tags.paren, class: 'paren' },
  { tag: tags.brace, class: 'brace' },
  { tag: tags.typeOperator, class: 'datatype' },
  { tag: tags.function(tags.variableName), class: 'function' },
  { tag: tags.variableName, class: 'variable' },
  { tag: tags.operator, class: 'operator' },
  { tag: tags.invalid, class: 'invalid' },
]);

const tokenize = (source: string): [string, string][] => {
  const spans: [string, string][] = [];
  highlightTree(sparqlLanguage.parser.parse(source), highlighter, (from, to, classes) => {
    spans.push([source.slice(from, to), classes]);
  });
  return spans;
};

describe('sparql language', () => {
  test('select: keywords, variables, IRIs and prefixed names', ({ expect }) => {
    expect(tokenize('SELECT ?fact ?p WHERE { ?fact <https://schema.org/worksFor> sx:Org . }')).toEqual([
      ['SELECT', 'keyword'],
      ['?fact', 'variable'],
      ['?p', 'variable'],
      ['WHERE', 'keyword'],
      ['{', 'brace'],
      ['?fact', 'variable'],
      ['<https://schema.org/worksFor>', 'iri'],
      ['sx:', 'prefix'],
      ['Org', 'name'],
      ['.', 'terminator'],
      ['}', 'brace'],
    ]);
  });

  test('filter: functions, operators, signed numbers and typed literals', ({ expect }) => {
    expect(tokenize('FILTER(regex(?o, "dx") && ?n >= -2 && ?d = "1"^^xsd:int)')).toEqual([
      ['FILTER', 'keyword'],
      ['(', 'paren'],
      ['regex', 'function'],
      ['(', 'paren'],
      ['?o', 'variable'],
      [',', 'separator'],
      ['"dx"', 'string'],
      [')', 'paren'],
      ['&&', 'operator'],
      ['?n', 'variable'],
      ['>=', 'operator'],
      ['-2', 'number'],
      ['&&', 'operator'],
      ['?d', 'variable'],
      ['=', 'operator'],
      ['"1"', 'string'],
      ['^^', 'datatype'],
      ['xsd:', 'prefix'],
      ['int', 'name'],
      [')', 'paren'],
    ]);
  });

  test('a keyword used as a prefix stays a prefix', ({ expect }) => {
    expect(tokenize('select:x')).toEqual([
      ['select:', 'prefix'],
      ['x', 'name'],
    ]);
  });
});
