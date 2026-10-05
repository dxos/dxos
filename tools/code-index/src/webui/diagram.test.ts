//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { layout, prepare } from './diagram.ts';

describe('diagram', () => {
  test('keeps a flowchart statement per line', ({ expect }) => {
    expect(prepare('graph LR\n  echo["@dxos/echo"]\n\n  echo --> keys["@dxos/keys"]')).toEqual({
      kind: 'flowchart',
      source: 'graph LR\necho["@dxos/echo"]\necho --> keys["@dxos/keys"]',
    });
  });

  test('splits semicolon statements and chained edges into one edge per line', ({ expect }) => {
    expect(prepare('graph TD; A["x; y"] --> B -->|uses| C;\n%% ref A src/a.ts')).toEqual({
      kind: 'flowchart',
      source: ['graph TD', 'A["x; y"] --> B', 'B -->|uses| C', '%% ref A src/a.ts'].join('\n'),
    });
  });

  test('reports the kinds the illustrator cannot lay out', ({ expect }) => {
    expect(prepare('%% a comment\nsequenceDiagram\n  A->>B: hi')).toEqual({
      kind: 'unsupported',
      type: 'sequenceDiagram',
    });
    expect(prepare('  ')).toEqual({ kind: 'unsupported', type: 'empty' });
  });

  test('lays a flowchart out as one object per node plus the connectors', async ({ expect }) => {
    const prepared = prepare('graph LR; A[Alpha] --> B[Beta] --> C[Gamma]');
    if (prepared.kind !== 'flowchart') {
      throw new Error('expected a flowchart');
    }
    const objects = await layout(prepared.source);
    const labels = objects.flatMap((object) =>
      object.elements.flatMap((element) => ('text' in element ? [element.text] : [])),
    );
    expect(labels).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'Gamma']));
    expect(objects.find((object) => object.id === 'edges')?.elements).toHaveLength(2);
  });

  test('rejects a flowchart with no nodes rather than drawing an empty panel', async ({ expect }) => {
    await expect(layout('graph TD\n  ???')).rejects.toThrow('no nodes');
  });
});
