//
// Copyright 2026 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { diagramBlockDescription } from './language.ts';
import { buildDiagramPreviews, renderDiagram } from './preview.ts';

const SOURCE = 'diagram flow=right\nnode A "Alpha"\nnode B "Beta"\nedge A -> B "calls"\n';

const DOCUMENT = [
  '# Spec',
  '',
  '```diagram',
  SOURCE.trimEnd(),
  '```',
  '',
  '```mdl',
  'type Color',
  '```',
  '',
  '```dxd',
  SOURCE.trimEnd(),
  '```',
  '',
].join('\n');

const stateOf = (doc: string) => {
  const state = EditorState.create({ doc, extensions: [markdown({ codeLanguages: [diagramBlockDescription] })] });
  ensureSyntaxTree(state, state.doc.length, 5_000);
  return state;
};

describe('diagram preview', () => {
  test('a fence the selection is outside of is replaced by its diagram', ({ expect }) => {
    const state = stateOf(DOCUMENT);
    const ranges: [number, number][] = [];
    buildDiagramPreviews(state).between(0, state.doc.length, (from, to, decoration) => {
      expect(decoration.spec.block).toBe(true);
      ranges.push([from, to]);
    });
    const opens = [...DOCUMENT.matchAll(/```(diagram|dxd)\n/g)].map((match) => match.index);
    const closes = [...DOCUMENT.matchAll(/```\n/g)].map((match) => match.index + 3);
    expect(ranges).toEqual([
      [opens[0], closes[0]],
      [opens[1], closes[2]],
    ]);
  });

  test('the fence holding the selection keeps its source and shows the diagram below it', ({ expect }) => {
    const inside = DOCUMENT.indexOf('node A') + 2;
    const state = stateOf(DOCUMENT).update({ selection: { anchor: inside } }).state;
    const ranges: [number, number][] = [];
    buildDiagramPreviews(state).between(0, state.doc.length, (from, to) => {
      ranges.push([from, to]);
    });
    const closes = [...DOCUMENT.matchAll(/```\n/g)].map((match) => match.index + 3);
    const secondOpen = DOCUMENT.indexOf('```dxd');
    expect(ranges).toEqual([
      [closes[0], closes[0]],
      [secondOpen, closes[2]],
    ]);
  });

  test('renders a standalone SVG for a valid source', async ({ expect }) => {
    const result = await renderDiagram(SOURCE);
    expect('svg' in result && result.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect('svg' in result && result.svg).toContain('Alpha');
    // The widget reserves this size before the image decodes, so it must match the SVG's own.
    expect('svg' in result && result.width > 0 && result.height > 0).toBe(true);
  });

  test('reports an error instead of an image for an empty source', async ({ expect }) => {
    const result = await renderDiagram('# nothing here\n');
    expect('error' in result).toBe(true);
  });
});
