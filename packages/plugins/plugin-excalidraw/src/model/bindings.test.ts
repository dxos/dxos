//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, Mermaid } from '@dxos/plugin-illustrator/model';

import { applyCommands } from './builder';

const FLOWCHART = 'flowchart TB\n  A[Alpha]\n  B[Beta]\n  A --> B\n';

const build = (): ContentMap => {
  const content: ContentMap = {};
  applyCommands(content, Mermaid.compile(FLOWCHART));
  return content;
};

describe('excalidraw bindings', () => {
  test('binds each arrow to the shapes it connects', ({ expect }) => {
    const content = build();
    const arrow = Object.values(content).find((record) => record.type === 'arrow');

    expect(arrow.startBinding).toMatchObject({ elementId: 'A/box' });
    expect(arrow.endBinding).toMatchObject({ elementId: 'B/box' });
  });

  test('shapes point back at their arrows and labels', ({ expect }) => {
    const content = build();
    const bound = (id: string) =>
      (content[id].boundElements ?? []).map((entry: { id: string; type: string }) => `${entry.type}:${entry.id}`);

    // A one-sided binding is discarded by excalidraw, so the shape must reference the arrow too.
    expect(bound('A/box')).toContain('arrow:edges/A-B');
    expect(bound('B/box')).toContain('arrow:edges/A-B');
    // The label travels with its box rather than floating as a separate shape.
    expect(bound('A/box')).toContain('text:A/box__label');
    expect(content['A/box__label'].containerId).toBe('A/box');
  });

  test('arrow endpoints stop at the shape outline rather than its centre', ({ expect }) => {
    const content = build();
    const arrow = Object.values(content).find((record) => record.type === 'arrow');
    const source = content['A/box'];
    const target = content['B/box'];

    const [start, end] = arrow.points.map(([x, y]: [number, number]) => ({ x: arrow.x + x, y: arrow.y + y }));
    expect(start.y).toBeGreaterThan(source.y + source.height / 2);
    expect(end.y).toBeLessThan(target.y + target.height / 2);
    // Vertically stacked boxes: the arrow spans the gap between their facing edges.
    expect(start.y).toBeGreaterThanOrEqual(source.y + source.height);
    expect(end.y).toBeLessThanOrEqual(target.y);
  });

  test('drops bindings to a removed shape', ({ expect }) => {
    const content = build();
    applyCommands(content, [{ op: 'remove-object', objectId: 'B' }]);
    const arrow = Object.values(content).find((record) => record.type === 'arrow');

    expect(arrow.startBinding).toMatchObject({ elementId: 'A/box' });
    expect(arrow.endBinding).toBeNull();
  });
});
