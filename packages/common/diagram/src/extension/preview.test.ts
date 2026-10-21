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
  test('one block widget after each diagram fence and none after other fences', ({ expect }) => {
    const state = stateOf(DOCUMENT);
    const positions: number[] = [];
    buildDiagramPreviews(state).between(0, state.doc.length, (from, to, decoration) => {
      expect(from).toEqual(to);
      expect(decoration.spec.block).toBe(true);
      positions.push(from);
    });
    const fenceEnds = [...DOCUMENT.matchAll(/```\n/g)].map((match) => match.index + 3);
    expect(positions).toEqual([fenceEnds[0], fenceEnds[2]]);
  });

  test('renders a standalone SVG for a valid source', async ({ expect }) => {
    const result = await renderDiagram(SOURCE);
    expect('svg' in result && result.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect('svg' in result && result.svg).toContain('Alpha');
  });

  test('reports an error instead of an image for an empty source', async ({ expect }) => {
    const result = await renderDiagram('# nothing here\n');
    expect('error' in result).toBe(true);
  });
});
