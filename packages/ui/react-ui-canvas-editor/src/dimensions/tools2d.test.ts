//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LINK_FOLD, nodeDragType } from '@dxos/react-ui-canvas';

import { toolDragData2D, tools2D, typeIcons2D } from './tools2d.ts';

describe('2D tools', () => {
  test("a node tool drags its node type onto the canvas, as the canvas's palette did; select and links do not", () => {
    const tools = tools2D();
    const rect = tools.find((tool) => tool.id === 'node:rect');
    expect(rect && nodeDragType(toolDragData2D(rect) ?? {})).toBe('rect');
    const select = tools.find((tool) => tool.id === 'select');
    expect(select && toolDragData2D(select)).toBeUndefined();
    const link = tools.find((tool) => tool.id.startsWith('link:'));
    expect(link && toolDragData2D(link)).toBeUndefined();
  });

  test('the link tools share one flyout in the create group', () => {
    const links = tools2D().filter((tool) => tool.id.startsWith('link:'));
    expect(links.length).toBeGreaterThan(1);
    expect(links.every((tool) => tool.fold === LINK_FOLD && tool.category === 'create')).toBe(true);
  });

  test('every type has an icon, including the ones the rail has no tool for', ({ expect }) => {
    const icons = typeIcons2D();
    // A text node reads as the T the palette draws, not as a note.
    expect(icons.note).toBe('ph--text-t--regular');
    // Neither a View nor an Object is created from the rail, and both still name themselves in the tree.
    for (const type of ['view', 'instance', 'rect', 'card', 'icon', 'line']) {
      expect(icons[type]).toMatch(/^ph--/);
    }
  });
});
