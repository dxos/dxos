//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { printCommands } from '../dsl/print.ts';
import { diagram } from './language.ts';
import { diagramDiagnostics } from './lint.ts';
import { diagramLanguage } from './syntax.ts';

describe('diagram language', () => {
  test('the mode composes without an editor', ({ expect }) => {
    expect(diagram({ layout: true })).toBeDefined();
    expect(diagramLanguage.name).toEqual('diagram');
  });

  test('highlighting comes off the tree, not a regex', ({ expect }) => {
    const source = 'object A @ 0,0 {\n  rect box 0,0 10x10 "hi" color=red\n}\n';
    const tree = diagramLanguage.parser.parse(source);
    const names: string[] = [];
    const cursor = tree.cursor();
    do {
      names.push(cursor.name);
    } while (cursor.next());
    expect(names).toContain('ObjectDecl');
    expect(names).toContain('BoxElement');
    expect(names).toContain('AttrName');
    expect(names).not.toContain('⚠');
  });
});

describe('diagram lint', () => {
  test('a clean document reports nothing', ({ expect }) => {
    expect(diagramDiagnostics('object A @ 0,0 {\n  rect box 0,0 10x10\n}\n', { layout: true })).toEqual([]);
  });

  test('parse problems carry a range inside the document', ({ expect }) => {
    const source = 'object A @ 0,0 {\n  rect box 0,0 10x10 colour=red\n}\n';
    const [diagnostic, ...rest] = diagramDiagnostics(source);
    expect(rest).toEqual([]);
    expect(diagnostic.message).toContain('colour');
    expect(source.slice(diagnostic.from, diagnostic.to)).toEqual('colour=red');
  });

  test('a layout error points at the object that caused it, not the top of the file', ({ expect }) => {
    // Two boxes on the same spot — `node-overlap`, which `Diagnostics` reports against both refs.
    const source = printCommands([
      { op: 'upsert-object', object: { id: 'A', origin: { x: 0, y: 0 }, elements: [box('a')] } },
      { op: 'upsert-object', object: { id: 'B', origin: { x: 0, y: 0 }, elements: [box('b')] } },
    ]);
    const overlaps = diagramDiagnostics(source, { layout: true }).filter(({ source: code }) => code === 'node-overlap');
    expect(overlaps.length).toBeGreaterThan(0);
    expect(overlaps[0].from).toBeGreaterThan(0);
    expect(source.slice(overlaps[0].from, overlaps[0].to)).toContain('rect');
  });

  test('layout is not analysed while the document has a syntax error', ({ expect }) => {
    const diagnostics = diagramDiagnostics('object A @ 0,0 {\n  rect box 0,0\n}\n', { layout: true });
    expect(diagnostics.every(({ source }) => source === undefined)).toBe(true);
  });
});

const box = (id: string) => ({ kind: 'rect', id, x: 0, y: 0, w: 100, h: 50 }) as const;
