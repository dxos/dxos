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
  PATH_FOLD,
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
    expect(create?.entries.some((entry) => entry.tool.kind === 'link')).toBe(true);
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
    // Spline and Draw are tools beside the polyline, which is the shape they make.
    expect(types(CREATE_GROUP)).toEqual([
      'rect',
      'ellipse',
      'polygon',
      'cloud',
      'polyline',
      'spline',
      'freehand',
      'freehandShape',
      'note',
      'icon',
    ]);
  });

  test('the polyline and the spline share one flyout, and the two tools that draw in one stroke the next', () => {
    const capabilities = { create: true, link: true, update: true, delete: true };
    const create = toolGroups(defaultNodeRegistry, defaultLinkRegistry, capabilities).find(
      (group) => group.name === CREATE_GROUP,
    );
    const runs = foldRuns(create?.entries ?? []);
    const folds = runs.flatMap((run) =>
      'fold' in run
        ? [[run.fold.name, run.fold.entries.map((entry) => (entry.tool.kind === 'node' ? entry.tool.type : 'link'))]]
        : [],
    );
    expect(folds.slice(1)).toEqual([
      [PATH_FOLD, ['polyline', 'spline']],
      [DRAW_FOLD, ['freehand', 'freehandShape']],
    ]);
  });

  test('the link types share one flyout above the polyline, after the closed shapes', () => {
    const capabilities = { create: true, link: true, update: true, delete: true };
    const create = toolGroups(defaultNodeRegistry, defaultLinkRegistry, capabilities).find(
      (group) => group.name === CREATE_GROUP,
    );
    const runs = foldRuns(create?.entries ?? []);
    const index = runs.findIndex((run) => 'fold' in run && run.fold.name === LINK_FOLD);
    const links = runs[index];
    expect(links && 'fold' in links && links.fold.entries.map((entry) => entry.tool.kind)).toEqual(
      Object.values(defaultLinkRegistry).map(() => 'link'),
    );
    // The fold leads with the default variant.
    expect(links && 'fold' in links && links.fold.entries[0].tool).toEqual({ kind: 'link', type: 'ortho' });
    // The lines are together: the links, then the tools that draw a line of their own.
    const typeAt = (at: number) => {
      const run = runs[at];
      return run && 'entry' in run && run.entry.tool.kind === 'node' ? run.entry.tool.type : undefined;
    };
    expect(typeAt(index - 1)).toBe('cloud');
    const paths = runs[index + 1];
    expect(paths && 'fold' in paths && paths.fold.name).toBe(PATH_FOLD);
    // Every other run is a node tool: alone, or folded with its variants.
    expect(
      runs
        .filter((_, at) => at !== index)
        .flatMap((run) => ('entry' in run ? [run.entry] : run.fold.entries))
        .every((entry) => entry.tool.kind === 'node'),
    ).toBe(true);
  });

  test('with no tool that draws a line, the link types end the create group', () => {
    const { rect, ellipse } = defaultNodeRegistry;
    const create = toolGroups({ rect, ellipse }, defaultLinkRegistry, {
      create: true,
      link: true,
      update: true,
      delete: true,
    }).find((group) => group.name === CREATE_GROUP);
    expect(create?.entries.map((entry) => entry.tool.kind)).toEqual([
      'node',
      'node',
      ...Object.values(defaultLinkRegistry).map(() => 'link'),
    ]);
  });

  test('a press on an element selects it with Select and with a create tool; the hand only moves the view', () => {
    expect(pressSelects({ kind: 'select' })).toBe(true);
    expect(pressSelects({ kind: 'node', type: 'rect' })).toBe(true);
    expect(pressSelects({ kind: 'hand' })).toBe(false);
  });
});
