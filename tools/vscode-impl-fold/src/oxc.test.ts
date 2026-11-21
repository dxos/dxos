//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { findBodiesOxc } from './oxc.ts';
import { DEFAULT_OPTIONS } from './select.ts';

const bodies = (lines: string[], filename = 'file.ts') =>
  findBodiesOxc(filename, lines.join('\n'), DEFAULT_OPTIONS.containerPattern);

describe('findBodiesOxc', () => {
  test('folds function, method and constructor bodies but not classes or interfaces', () => {
    expect(
      bodies([
        /* 0 */ 'interface Api {',
        /* 1 */ '  run(): void;',
        /* 2 */ '}',
        /* 3 */ 'export class Impl implements Api {',
        /* 4 */ '  constructor(private readonly name: string) {',
        /* 5 */ '    init();',
        /* 6 */ '  }',
        /* 7 */ '  run(): void {',
        /* 8 */ '    work();',
        /* 9 */ '  }',
        /* 10 */ '}',
        /* 11 */ 'function top() {',
        /* 12 */ '  work();',
        /* 13 */ '}',
      ]),
    ).toEqual([
      { start: 4, end: 5 },
      { start: 7, end: 8 },
      { start: 11, end: 12 },
    ]);
  });

  test('folds from the brace line of a multi-line signature', () => {
    expect(bodies(['function run(', '  a: number,', '): number {', '  const b = a;', '  return b;', '}'])).toEqual([
      { start: 2, end: 4 },
    ]);
  });

  test('folds arrow and generator bodies, not object literals or expression-bodied arrows', () => {
    expect(
      bodies([
        /* 0 */ 'const add = (a: number) => {',
        /* 1 */ '  return a;',
        /* 2 */ '};',
        /* 3 */ 'const config = {',
        /* 4 */ '  port: 1,',
        /* 5 */ '  handler() {',
        /* 6 */ '    work();',
        /* 7 */ '  },',
        /* 8 */ '};',
        /* 9 */ 'const double = (a: number) =>',
        /* 10 */ '  a * 2;',
        /* 11 */ 'const program = Effect.gen(function* () {',
        /* 12 */ '  yield* work();',
        /* 13 */ '});',
      ]),
    ).toEqual([
      { start: 0, end: 1 },
      { start: 5, end: 6 },
      { start: 11, end: 12 },
    ]);
  });

  test('keeps describe blocks open and folds the tests inside them', () => {
    expect(
      bodies(
        [
          /* 0 */ "describe('suite', () => {",
          /* 1 */ "  test('one', () => {",
          /* 2 */ '    check();',
          /* 3 */ '  });',
          /* 4 */ "  test.describe('nested', () => {",
          /* 5 */ "    it('two', async ({ expect }) => {",
          /* 6 */ '      check();',
          /* 7 */ '    });',
          /* 8 */ '  });',
          /* 9 */ '});',
        ],
        'file.test.ts',
      ),
    ).toEqual([
      { start: 1, end: 2 },
      { start: 5, end: 6 },
    ]);
  });

  test('counts lines in UTF-16 offsets past non-ASCII text', () => {
    expect(bodies(["const label = '✓ — 日本語 🎉';", 'function run() {', '  work();', '}'])).toEqual([
      { start: 1, end: 2 },
    ]);
  });

  test('parses TSX', () => {
    expect(
      bodies(
        ['export const View = () => {', '  return <div>{items.map((item) => <span>{item}</span>)}</div>;', '};'],
        'view.tsx',
      ),
    ).toEqual([{ start: 0, end: 1 }]);
  });

  test('returns undefined for a file that does not parse', () => {
    expect(bodies(['function run( {'])).toBeUndefined();
  });
});
