//
// Copyright 2026 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { diagramBlockDescription } from './language.ts';
import { buildDiagramPreviews, diagramPreview, renderDiagram } from './preview.ts';

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

  test('a dark editor draws the dark palette, and each theme keeps its own render', async ({ expect }) => {
    const light = await renderDiagram(SOURCE);
    const dark = await renderDiagram(SOURCE, 'dark');
    expect('svg' in light && light.svg).toContain('color: #262626');
    expect('svg' in dark && dark.svg).toContain('color: #e5e5e5');
    // The host's surface shows behind the picture in both, so neither paints a ground of its own.
    expect('svg' in light && light.svg).toContain('background: transparent');
    expect('svg' in dark && dark.svg).toContain('background: transparent');
    expect(await renderDiagram(SOURCE, 'dark')).toBe(dark);
  });

  test('a colour-mode switch redraws the fences without an edit', ({ expect }) => {
    const mode = new Compartment();
    const start = EditorState.create({
      doc: DOCUMENT,
      extensions: [
        markdown({ codeLanguages: [diagramBlockDescription] }),
        diagramPreview(),
        mode.of(EditorView.darkTheme.of(false)),
      ],
    });
    ensureSyntaxTree(start, start.doc.length, 5_000);
    const themes = (state: EditorState) => {
      const found: string[] = [];
      buildDiagramPreviews(state).between(0, state.doc.length, (_from, _to, decoration) => {
        found.push(decoration.spec.widget.theme);
      });
      return found;
    };
    expect(themes(start)).toEqual(['light', 'light']);
    const dark = start.update({ effects: mode.reconfigure(EditorView.darkTheme.of(true)) }).state;
    expect(themes(dark)).toEqual(['dark', 'dark']);
  });

  test('reports an error instead of an image for an empty source', async ({ expect }) => {
    const result = await renderDiagram('# nothing here\n');
    expect('error' in result).toBe(true);
  });
});
