//
// Copyright 2026 DXOS.org
//

import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';
import { describe, test } from 'vitest';

import { turtleLanguage } from './turtle.ts';

/** Class names per standard tag, so a token's colour is asserted by the tag the editor's theme would style. */
const highlighter = tagHighlighter([
  { tag: tags.lineComment, class: 'comment' },
  { tag: tags.keyword, class: 'keyword' },
  { tag: tags.url, class: 'iri' },
  { tag: tags.namespace, class: 'prefix' },
  { tag: tags.propertyName, class: 'name' },
  { tag: tags.special(tags.variableName), class: 'blank' },
  { tag: tags.string, class: 'string' },
  { tag: tags.annotation, class: 'language' },
  { tag: tags.typeOperator, class: 'datatype' },
  { tag: tags.number, class: 'number' },
  { tag: tags.bool, class: 'bool' },
  { tag: tags.punctuation, class: 'terminator' },
  { tag: tags.separator, class: 'separator' },
  { tag: tags.squareBracket, class: 'bracket' },
  { tag: tags.brace, class: 'brace' },
  { tag: tags.invalid, class: 'invalid' },
]);

/** `[text, class]` for every highlighted span of `source`. */
const tokenize = (source: string): [string, string][] => {
  const spans: [string, string][] = [];
  highlightTree(turtleLanguage.parser.parse(source), highlighter, (from, to, classes) => {
    spans.push([source.slice(from, to), classes]);
  });
  return spans;
};

describe('turtle language', () => {
  test('prefix declaration: keyword, prefix and IRI', ({ expect }) => {
    expect(tokenize('@prefix sx: <https://dxos.org/semantic#> .')).toEqual([
      ['@prefix', 'keyword'],
      ['sx:', 'prefix'],
      ['<https://dxos.org/semantic#>', 'iri'],
      ['.', 'terminator'],
    ]);
  });

  test('statement: prefixed names (a digit-led local name included), `a`, literals and separators', ({ expect }) => {
    expect(tokenize('fact:3f2a a sx:Fact ; sx:quote "I own it"@en , 42 ; sx:ok true .')).toEqual([
      ['fact:', 'prefix'],
      ['3f2a', 'name'],
      ['a', 'keyword'],
      ['sx:', 'prefix'],
      ['Fact', 'name'],
      [';', 'separator'],
      ['sx:', 'prefix'],
      ['quote', 'name'],
      ['"I own it"', 'string'],
      ['@en', 'language'],
      [',', 'separator'],
      ['42', 'number'],
      [';', 'separator'],
      ['sx:', 'prefix'],
      ['ok', 'name'],
      ['true', 'bool'],
      ['.', 'terminator'],
    ]);
  });

  test('TriG graph block, typed literal, blank node and comment', ({ expect }) => {
    expect(tokenize('g1:graph { _:b1 prov:at "2026"^^xsd:dateTime . } # done')).toEqual([
      ['g1:', 'prefix'],
      ['graph', 'name'],
      ['{', 'brace'],
      ['_:b1', 'blank'],
      ['prov:', 'prefix'],
      ['at', 'name'],
      ['"2026"', 'string'],
      ['^^', 'datatype'],
      ['xsd:', 'prefix'],
      ['dateTime', 'name'],
      ['.', 'terminator'],
      ['}', 'brace'],
      ['# done', 'comment'],
    ]);
  });

  test('a long string spans lines', ({ expect }) => {
    expect(tokenize('sx:q """one\ntwo""" .')).toEqual([
      ['sx:', 'prefix'],
      ['q', 'name'],
      ['"""one', 'string'],
      ['two"""', 'string'],
      ['.', 'terminator'],
    ]);
  });
});
