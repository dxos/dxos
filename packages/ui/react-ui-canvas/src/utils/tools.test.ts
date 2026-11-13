//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { defaultLinkRegistry, defaultNodeRegistry } from '../components/index.ts';
import {
  CONTAINERS_GROUP,
  CREATE_GROUP,
  DRAW_FOLD,
  EXTENSIONS_GROUP,
  LINK_FOLD,
  TOOLS_GROUP,
  foldRuns,
  pressSelects,
  toolGroups,
} from './tools.ts';

describe('toolGroups', () => {
  test('the link tools sit with the shapes, in the create group, after the fixed tools', () => {
    const groups = toolGroups(defaultNodeRegistry, defaultLinkRegistry, {
      create: true,
      link: true,
      update: true,
      delete: true,
    });
    expect(groups[0].name).toBe(TOOLS_GROUP);
    const create = groups.find((group) => group.name === CREATE_GROUP);
    expect(create?.entries.some((entry) => entry.tool.kind === 'node')).toBe(true);
    expect(create?.entries.at(-1)?.tool.kind).toBe('link');
    expect(groups.filter((group) => group.entries.some((entry) => entry.tool.kind === 'link'))).toHaveLength(1);
  });

  test('the containers and the card are offered in groups of their own, after the shapes', () => {
    const groups = toolGroups(defaultNodeRegistry, defaultLinkRegistry, {
      create: true,
      link: true,
      update: true,
      delete: true,
    });
    const types = (name: string) =>
      groups
        .find((group) => group.name === name)
        ?.entries.flatMap((entry) => (entry.tool.kind === 'node' ? [entry.tool.type] : []));
    expect(groups.map((group) => group.name)).toEqual([TOOLS_GROUP, CREATE_GROUP, CONTAINERS_GROUP, EXTENSIONS_GROUP]);
    expect(types(CONTAINERS_GROUP)).toEqual(['hull', 'view']);
    expect(types(EXTENSIONS_GROUP)).toEqual(['card']);
    // Draw is a tool beside the polyline, which is the shape it makes.
    expect(types(CREATE_GROUP)).toEqual([
      'rect',
      'ellipse',
      'polygon',
      'cloud',
      'polyline',
      'freehand',
      'freehandShape',
      'note',
      'icon',
    ]);
  });

  test('the two tools that draw in one stroke share one flyout, after the polyline', () => {
    const capabilities = { create: true, link: true, update: true, delete: true };
    const create = toolGroups(defaultNodeRegistry, defaultLinkRegistry, capabilities).find(
      (group) => group.name === CREATE_GROUP,
    );
    const runs = foldRuns(create?.entries ?? []);
    const polyline = runs.findIndex(
      (run) => 'entry' in run && run.entry.tool.kind === 'node' && run.entry.tool.type === 'polyline',
    );
    const draw = runs[polyline + 1];
    expect(draw && 'fold' in draw && draw.fold.name).toBe(DRAW_FOLD);
    expect(
      draw && 'fold' in draw && draw.fold.entries.map((entry) => entry.tool.kind === 'node' && entry.tool.type),
    ).toEqual(['freehand', 'freehandShape']);
  });

  test('the link types share one flyout at the end of the create group', () => {
    const capabilities = { create: true, link: true, update: true, delete: true };
    const create = toolGroups(defaultNodeRegistry, defaultLinkRegistry, capabilities).find(
      (group) => group.name === CREATE_GROUP,
    );
    const runs = foldRuns(create?.entries ?? []);
    const last = runs.at(-1);
    expect(last && 'fold' in last && last.fold.name).toBe(LINK_FOLD);
    expect(last && 'fold' in last && last.fold.entries.map((entry) => entry.tool.kind)).toEqual(
      Object.values(defaultLinkRegistry).map(() => 'link'),
    );
    // Before it, the node tools: each alone, or folded with its variants.
    expect(
      runs
        .slice(0, -1)
        .flatMap((run) => ('entry' in run ? [run.entry] : run.fold.entries))
        .every((entry) => entry.tool.kind === 'node'),
    ).toBe(true);
  });

  test('a press on an element selects it with Select and with a create tool; the hand only moves the view', () => {
    expect(pressSelects({ kind: 'select' })).toBe(true);
    expect(pressSelects({ kind: 'node', type: 'rect' })).toBe(true);
    expect(pressSelects({ kind: 'hand' })).toBe(false);
  });
});
