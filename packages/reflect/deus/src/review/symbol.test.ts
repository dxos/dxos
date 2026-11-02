//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { declarationSnippet, findSymbolLine } from './symbol.ts';

describe('symbol lookup', () => {
  const source = [
    'import x from "y";',
    '',
    'export class Spec {',
    '  static make(): Spec {',
    '    return new Spec();',
    '  }',
    '}',
    '',
    'export const make = () => Spec.make();',
  ].join('\n');

  test('finds declarations before mentions, and members after their owner', ({ expect }) => {
    expect(findSymbolLine(source, 'Spec')).toBe(3);
    expect(findSymbolLine(source, 'make')).toBe(9);
    expect(findSymbolLine(source, 'Spec.make')).toBe(4);
    expect(findSymbolLine(source, 'Missing')).toBeUndefined();
  });

  test('a snippet runs from the declaration to where its brackets close', ({ expect }) => {
    expect(declarationSnippet(source, 'Spec.make')).toEqual({
      line: 4,
      lines: ['  static make(): Spec {', '    return new Spec();', '  }'],
      truncated: false,
    });
    expect(declarationSnippet(source, 'make')).toEqual({
      line: 9,
      lines: ['export const make = () => Spec.make();'],
      truncated: false,
    });
    expect(declarationSnippet(source, 'Missing')).toBeUndefined();
    // No symbol: the file's opening lines, after the copyright header.
    expect(declarationSnippet(['//', '// Copyright', '//', '', 'import a;', 'a();'].join('\n'))).toMatchObject({
      line: 5,
      lines: ['import a;', 'a();'],
    });
  });
});
