//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DEFAULT_OPTIONS, type FoldRange, type SymbolNode, selectBodies } from './select.ts';

const symbol = (
  kind: string,
  start: number,
  end: number,
  children: SymbolNode[] = [],
  selectionLine = start,
  name = kind,
): SymbolNode => ({
  name,
  kind,
  range: { start, end },
  selectionLine,
  children,
});

const select = (source: string, symbols: SymbolNode[], foldingRanges: FoldRange[]) => {
  const lines = source.split('\n');
  return selectBodies({ ...DEFAULT_OPTIONS, symbols, foldingRanges, lineAt: (line) => lines[line] ?? '' });
};

describe('selectBodies', () => {
  test('folds method bodies and keeps the class and interface open', () => {
    const source = [
      /* 0 */ 'interface Api {',
      /* 1 */ '  run(): void;',
      /* 2 */ '}',
      /* 3 */ 'class Impl implements Api {',
      /* 4 */ '  constructor() {',
      /* 5 */ '    init();',
      /* 6 */ '  }',
      /* 7 */ '  run() {',
      /* 8 */ '    work();',
      /* 9 */ '  }',
      /* 10 */ '}',
    ].join('\n');
    const symbols = [
      symbol('Interface', 0, 2, [symbol('Method', 1, 1)]),
      symbol('Class', 3, 10, [symbol('Constructor', 4, 6), symbol('Method', 7, 9)]),
    ];
    const ranges = [
      { start: 0, end: 1 },
      { start: 3, end: 9 },
      { start: 4, end: 5 },
      { start: 7, end: 8 },
    ];
    expect(select(source, symbols, ranges)).toEqual([
      { start: 4, end: 5 },
      { start: 7, end: 8 },
    ]);
  });

  test('skips a multi-line parameter list and folds the body after it', () => {
    const source = ['function run(', '  a: number,', '  b: number,', '): number {', '  return a + b;', '}'].join('\n');
    const ranges = [
      { start: 0, end: 2 },
      { start: 3, end: 4 },
    ];
    expect(select(source, [symbol('Function', 0, 5)], ranges)).toEqual([{ start: 3, end: 4 }]);
  });

  test('folds an arrow-function const but not an object literal const', () => {
    const source = [
      /* 0 */ 'const add = (a: number) => {',
      /* 1 */ '  return a;',
      /* 2 */ '};',
      /* 3 */ 'const config = {',
      /* 4 */ '  port: 1,',
      /* 5 */ '};',
    ].join('\n');
    const ranges = [
      { start: 0, end: 1 },
      { start: 3, end: 4 },
    ];
    expect(select(source, [symbol('Constant', 0, 2), symbol('Constant', 3, 5)], ranges)).toEqual([
      { start: 0, end: 1 },
    ]);
  });

  test('folds methods inside an object literal const', () => {
    const source = ['const api = {', '  run() {', '    work();', '  },', '};'].join('\n');
    const ranges = [
      { start: 0, end: 3 },
      { start: 1, end: 2 },
    ];
    expect(select(source, [symbol('Constant', 0, 4, [symbol('Method', 1, 3)])], ranges)).toEqual([
      { start: 1, end: 2 },
    ]);
  });

  test('ignores the JSDoc fold above a function', () => {
    const source = ['/**', ' * Doc.', ' */', 'function run() {', '  work();', '}'].join('\n');
    const ranges: FoldRange[] = [
      { start: 0, end: 2, kind: 'comment' },
      { start: 3, end: 4 },
    ];
    expect(select(source, [symbol('Function', 0, 5, [], 3)], ranges)).toEqual([{ start: 3, end: 4 }]);
  });

  test('does not fold nested functions separately', () => {
    const source = ['function outer() {', '  function inner() {', '    work();', '  }', '}'].join('\n');
    const ranges = [
      { start: 0, end: 3 },
      { start: 1, end: 2 },
    ];
    expect(select(source, [symbol('Function', 0, 4, [symbol('Function', 1, 3)])], ranges)).toEqual([
      { start: 0, end: 3 },
    ]);
  });

  test('keeps describe blocks open and folds the tests inside them', () => {
    const source = [
      /* 0 */ "describe('suite', () => {",
      /* 1 */ "  test('one', () => {",
      /* 2 */ '    check();',
      /* 3 */ '  });',
      /* 4 */ "  test.describe('nested', () => {",
      /* 5 */ "    it('two', () => {",
      /* 6 */ '      check();',
      /* 7 */ '    });',
      /* 8 */ '  });',
      /* 9 */ '});',
    ].join('\n');
    const symbols = [
      symbol(
        'Function',
        0,
        9,
        [
          symbol('Function', 1, 3, [], 1, "test('one') callback"),
          symbol(
            'Function',
            4,
            8,
            [symbol('Function', 5, 7, [], 5, "it('two') callback")],
            4,
            "test.describe('nested') callback",
          ),
        ],
        0,
        "describe('suite') callback",
      ),
    ];
    const ranges = [
      { start: 0, end: 8 },
      { start: 1, end: 2 },
      { start: 4, end: 7 },
      { start: 5, end: 6 },
    ];
    expect(select(source, symbols, ranges)).toEqual([
      { start: 1, end: 2 },
      { start: 5, end: 6 },
    ]);
  });

  test('falls back to the symbol range when the language has no folding provider', () => {
    const source = ['def run():', '    work()', '    more()'].join('\n');
    expect(select(source, [symbol('Function', 0, 2)], [])).toEqual([{ start: 0, end: 2 }]);
  });
});
