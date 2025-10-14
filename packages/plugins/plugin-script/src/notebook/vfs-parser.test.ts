//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { NotebookVirtualParser, VirtualTypeScriptParser } from './vfs-parser';

describe('vfs-parser', () => {
  test('parse simple assignments', () => {
    const parser = new VirtualTypeScriptParser();

    const tests = [
      {
        input: 'const a = 1',
        expected: {
          name: 'a',
          type: 'variable',
        },
      },
      {
        input: 'a = 1',
        expected: {
          name: 'a',
          type: 'variable',
        },
      },
    ];

    tests.forEach(({ input, expected }) => {
      const result = parser.parseExpression(input);
      expect(result, input).toMatchObject(expected);
    });
  });

  test('parse variable with references', () => {
    const parser = new VirtualTypeScriptParser();

    const tests = [
      {
        input: 'const y = x * 2',
        expected: {
          name: 'y',
          type: 'variable',
          references: ['x'],
        },
      },
      {
        input: 'y = x * 2',
        expected: {
          name: 'y',
          type: 'variable',
          references: ['x'],
        },
      },
    ];

    tests.forEach(({ input, expected }) => {
      const result = parser.parseExpression(input);
      expect(result, input).toMatchObject(expected);
    });
  });

  test('parse simple expression with references', () => {
    const parser = new VirtualTypeScriptParser();

    const result = parser.parseExpression('(a + b) * c');
    expect(result).toMatchObject({
      references: ['a', 'b', 'c'],
    });
  });

  test('parse single expression', () => {
    const parser = new VirtualTypeScriptParser();

    const result = parser.parseExpression('const add = (a: number, b: number): number => a + b;');
    expect(result).toMatchObject({
      name: 'add',
      type: 'function',
      valueType: expect.stringContaining('(a: number, b: number) => number'),
      returnType: 'number',
      parameters: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
      ],
    });
  });

  test('analyze multiple files', () => {
    const parser = new VirtualTypeScriptParser();

    const files = [
      {
        fileName: '/test.ts',
        content: 'export const PI = 3.14159;\nexport function square(x: number): number { return x * x; }',
      },
    ];

    const results = parser.analyzeFiles(files);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      name: 'PI',
      type: 'variable',
      valueType: '3.14159',
    });
    expect(results[1]).toMatchObject({
      name: 'square',
      type: 'function',
      returnType: 'number',
      parameters: [{ name: 'x', type: 'number' }],
    });
  });

  test('notebook cell analysis', () => {
    const parser = new NotebookVirtualParser();

    const cells = [
      { id: 'cell1', code: 'const x: number = 10;' },
      { id: 'cell2', code: 'const y = x * 2;' },
      { id: 'cell3', code: 'console.log(y);' },
    ];

    const analysis = parser.analyzeNotebook(cells);

    // Cell 1 exports x.
    const cell1 = analysis.get('cell1');
    expect(cell1?.exports).toHaveLength(1);
    expect(cell1?.exports[0]).toMatchObject({
      name: 'x',
      type: 'variable',
      valueType: 'number',
    });
    expect(cell1?.imports).toHaveLength(0);

    // Cell 2 imports x and exports y.
    const cell2 = analysis.get('cell2');
    expect(cell2?.exports).toHaveLength(1);
    expect(cell2?.exports[0]).toMatchObject({
      name: 'y',
      type: 'variable',
    });
    expect(cell2?.imports).toContain('x');

    // Cell 3 imports y.
    const cell3 = analysis.get('cell3');
    expect(cell3?.exports).toHaveLength(0);
    expect(cell3?.imports).toContain('y');
  });
});
