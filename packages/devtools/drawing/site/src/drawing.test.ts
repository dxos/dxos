//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { UmlGrid } from '@dxos/diagram';
import { source } from '@dxos/drawing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { draw } from './drawing.ts';
import { GRID } from './markup.ts';

const SOURCE = `
node Browser
node Api "API server" right-of Browser
edge Browser -> Api "HTTPS"
`;

describe('draw', () => {
  test('the page grid is the engine layout unit', ({ expect }) => {
    expect(GRID).toBe(UmlGrid.GRID);
  });

  test('downloads a .dx.svg that carries its source', async ({ expect }) => {
    const drawing = await EffectEx.runPromise(draw(SOURCE, 'web'));
    expect(drawing.file.fileName).toBe('web.dx.svg');
    expect(source(drawing.file.svg)).toBe(SOURCE);
    expect(drawing.report.failed).toBe(false);
    expect(drawing.reportHtml).toContain('2 nodes, 1 connector');
  });

  test('shows the drawing snapped to an odd number of grid cells', async ({ expect }) => {
    const { stageHtml } = await EffectEx.runPromise(draw(SOURCE, 'web'));
    expect(stageHtml).toBeDefined();
    expect(stageHtml).not.toContain('dx-payload');
    expect(stageHtml).not.toContain('<style>');
    const [x, y, width, height] = (/viewBox="([^"]*)"/.exec(stageHtml ?? '')?.[1] ?? '').split(' ').map(Number);
    for (const value of [x, y, width, height]) {
      expect(Math.abs(value % GRID)).toBe(0);
    }
    const cols = Number(/--cols: (\d+)/.exec(stageHtml ?? '')?.[1]);
    const rows = Number(/--rows: (\d+)/.exec(stageHtml ?? '')?.[1]);
    expect([cols * GRID, rows * GRID]).toEqual([width, height]);
    expect([cols % 2, rows % 2]).toEqual([1, 1]);
  });

  test('reports a source that does not compile without a drawing', async ({ expect }) => {
    const drawing = await EffectEx.runPromise(draw('node "unterminated', 'broken'));
    expect(drawing.stageHtml).toBeUndefined();
    expect(drawing.report.failed).toBe(true);
    expect(drawing.reportHtml).toContain('did not compile');
  });
});
