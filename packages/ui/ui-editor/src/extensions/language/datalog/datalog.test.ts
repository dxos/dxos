//
// Copyright 2026 DXOS.org
//

import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';
import { describe, test } from 'vitest';

import { datalogLanguage } from './datalog.ts';

/** Class names per standard tag, so a token's colour is asserted by the tag the editor's theme would style. */
const highlighter = tagHighlighter([
  { tag: tags.lineComment, class: 'lineComment' },
  { tag: tags.blockComment, class: 'blockComment' },
  { tag: tags.string, class: 'string' },
  { tag: tags.special(tags.number), class: 'duration' },
  { tag: tags.number, class: 'number' },
  { tag: tags.variableName, class: 'variable' },
  { tag: tags.definition(tags.function(tags.variableName)), class: 'head' },
  { tag: tags.function(tags.variableName), class: 'predicate' },
  { tag: tags.atom, class: 'atom' },
  { tag: tags.operatorKeyword, class: 'negation' },
  { tag: tags.keyword, class: 'aggregate' },
  { tag: tags.definitionOperator, class: 'definition' },
  { tag: tags.compareOperator, class: 'compare' },
  { tag: tags.separator, class: 'separator' },
  { tag: tags.punctuation, class: 'terminator' },
  { tag: tags.paren, class: 'paren' },
  { tag: tags.brace, class: 'brace' },
  { tag: tags.invalid, class: 'invalid' },
]);

/** `[text, class]` for every highlighted span of `source`. */
const tokenize = (source: string): [string, string][] => {
  const spans: [string, string][] = [];
  highlightTree(datalogLanguage.parser.parse(source), highlighter, (from, to, classes) => {
    spans.push([source.slice(from, to), classes]);
  });
  return spans;
};

describe('datalog language', () => {
  test('rule: head, body predicates, variables, atoms and operators', ({ expect }) => {
    expect(tokenize('wake(reply) :- works_on(dima, X), X != _.')).toEqual([
      ['wake', 'head'],
      ['(', 'paren'],
      ['reply', 'atom'],
      [')', 'paren'],
      [':-', 'definition'],
      ['works_on', 'predicate'],
      ['(', 'paren'],
      ['dima', 'atom'],
      [',', 'separator'],
      ['X', 'variable'],
      [')', 'paren'],
      [',', 'separator'],
      ['X', 'variable'],
      ['!=', 'compare'],
      ['_', 'variable'],
      ['.', 'terminator'],
    ]);
  });

  test('the head resets after each clause', ({ expect }) => {
    const heads = tokenize('a(x). b(Y) :- a(Y).').filter(([, kind]) => kind === 'head');
    expect(heads).toEqual([
      ['a', 'head'],
      ['b', 'head'],
    ]);
  });

  test('comments in every form the lexer accepts', ({ expect }) => {
    expect(tokenize('% one\n// two\n/* three\nfour */ a(x).').slice(0, 4)).toEqual([
      ['% one', 'lineComment'],
      ['// two', 'lineComment'],
      ['/* three', 'blockComment'],
      ['four */', 'blockComment'],
    ]);
  });

  test('strings, numbers and durations', ({ expect }) => {
    expect(tokenize(`p("a \\"b\\"", 'c', -1.5, 2d).`)).toEqual([
      ['p', 'head'],
      ['(', 'paren'],
      ['"a \\"b\\""', 'string'],
      [',', 'separator'],
      ["'c'", 'string'],
      [',', 'separator'],
      ['-1.5', 'number'],
      [',', 'separator'],
      ['2d', 'duration'],
      [')', 'paren'],
      ['.', 'terminator'],
    ]);
  });

  test('negation and aggregates', ({ expect }) => {
    const spans = tokenize('q(N) :- not r(a), !s(b), N = count : { t(_) }.');
    expect(spans).toContainEqual(['not', 'negation']);
    expect(spans).toContainEqual(['!', 'negation']);
    expect(spans).toContainEqual(['count', 'aggregate']);
    expect(spans).toContainEqual([':', 'aggregate']);
    expect(spans).toContainEqual(['{', 'brace']);
    expect(spans).toContainEqual(['r', 'predicate']);
  });

  test('an aggregate name used as a predicate stays a predicate', ({ expect }) => {
    expect(tokenize('p(X) :- count(X).')).toContainEqual(['count', 'predicate']);
  });

  test('an unterminated string is invalid', ({ expect }) => {
    expect(tokenize('p("open')).toContainEqual(['"open', 'invalid']);
  });
});
