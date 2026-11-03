//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap } from '@dxos/diagram';
import { DEFAULT_LAYER } from '@dxos/react-ui-canvas';
import { type InstanceNode, type NodeBase, type ViewNode, isViewNode } from '@dxos/scene';

import {
  ROOT_VIEW_ID,
  canvasRecordOf,
  deleteStyleClass,
  hasLegacyRoot,
  hasUnplacedLayers,
  isNodeRecord,
  migrateContent,
  migrateLayers,
  nodeKey,
  orphanedViews,
  pruneOrphanedViews,
  readViews,
  resolveDrawingLook,
  rootOf,
  seedContent,
  styleClassUses,
  updateCanvasRecord,
  upgradeNode,
  writeStyles,
  writeViews,
} from './content.ts';

const box = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

describe('content', () => {
  test('a node stored with the legacy `frame` type reads as a `view` node', ({ expect }) => {
    const stored: NodeBase & { scene: string } = {
      id: 'f',
      type: 'frame',
      z: 'a0',
      scene: 'child',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
    };
    const node = upgradeNode(stored);
    expect(node).toEqual({ ...stored, type: 'view' });
    expect(isViewNode(node)).toBe(true);
  });

  test('a composite scene survives a write and a read; a scene stores no timeline', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    writeViews(content, {
      root: { id: 'root', nodes: { a: { id: 'a', type: 'rect', ...box } }, links: {} },
      object: { id: 'object', kind: 'composite', name: 'Object', nodes: {}, links: {} },
    });
    const scenes = readViews(content);
    expect(scenes.object.kind).toBe('composite');
    // A plain scene stores no kind, and no scene a timeline: animation is an animator Animation (F-2.3).
    expect(Reflect.get(content['scene:root'], 'sceneKind')).toBeUndefined();
    expect(Reflect.get(content['scene:root'], 'timeline')).toBeUndefined();
  });

  test('a new canvas keys its root scene once: `scene:root`', ({ expect }) => {
    const content: ContentMap = {};
    expect(seedContent(content)).toBe('root');
    expect(Object.keys(content).sort()).toEqual(['canvas', 'scene:root']);
  });

  test('a node saved with a top-level opacity, and a frame with its link fields, read in the current shape', ({
    expect,
  }) => {
    const object = { '/': 'dxn:echo:@:01J00000000000000000000000' };
    const content: ContentMap = {
      'canvas': { kind: 'canvas', root: 'root' },
      'scene:root': {
        kind: 'scene',
        id: 'root',
        // A timeline saved before canvas animation moved to the animator is not read.
        timeline: {
          duration: 1,
          tracks: { 'a:opacity': { target: 'a', property: 'opacity', keys: [{ t: 0, value: 0 }] } },
        },
      },
      'scene:f': { kind: 'scene', id: 'f' },
      'node:a': {
        kind: 'node',
        scene: 'root',
        node: { id: 'a', type: 'rect', ...box, opacity: 0.5, style: { hue: 'red' } },
      },
      'node:f': {
        kind: 'node',
        scene: 'root',
        node: { id: 'f', type: 'frame', scene: 'f', ...box, opacity: 0.25, contents: true, object },
      },
    };
    const scenes = readViews(content);
    expect(scenes.root.nodes.a).toEqual({ id: 'a', type: 'rect', ...box, style: { hue: 'red', opacity: 0.5 } });
    expect(scenes.root.nodes.f).toEqual({
      id: 'f',
      type: 'view',
      scene: 'f',
      ...box,
      style: { opacity: 0.25 },
      link: { object, contents: true },
    });
    expect(Reflect.get(scenes.root, 'timeline')).toBeUndefined();

    // The next write stores the current shape.
    expect(writeViews(content, scenes)).toBe(true);
    const record = content['node:f'];
    expect(isNodeRecord(record) && record.node).toMatchObject({ link: { object, contents: true } });
    expect(isNodeRecord(record) ? Reflect.has(record.node, 'contents') : true).toBe(false);
  });

  test('a node stored with the legacy `frame` type reads as a `view` node, and the next write stores `view`', ({
    expect,
  }) => {
    const content: ContentMap = {
      'canvas': { kind: 'canvas', root: 'root' },
      'scene:root': { kind: 'scene', id: 'root' },
      'scene:f': { kind: 'scene', id: 'f' },
      'node:f': { kind: 'node', scene: 'root', node: { id: 'f', type: 'frame', scene: 'f', ...box } },
    };
    const views = readViews(content);
    expect(views.root.nodes.f).toEqual({ id: 'f', type: 'view', scene: 'f', ...box });
    expect(writeViews(content, views)).toBe(true);
    const record = content['node:f'];
    expect(isNodeRecord(record) && record.node.type).toBe('view');
  });

  test('a canvas saved with the legacy root id is renamed in place', ({ expect }) => {
    const content: ContentMap = {
      'canvas': { kind: 'canvas', root: 'scene:root' },
      'scene:scene:root': { kind: 'scene', id: 'scene:root', name: 'Root' },
      'scene:f': { kind: 'scene', id: 'f' },
      'node:a': { kind: 'node', scene: 'scene:root', node: { id: 'a', type: 'rect', ...box } },
      'node:f': { kind: 'node', scene: 'scene:root', node: { id: 'f', type: 'frame', scene: 'f', ...box } },
      // A shape in a nested scene that shows the root itself.
      'node:up': { kind: 'node', scene: 'f', node: { id: 'up', type: 'frame', scene: 'scene:root', ...box } },
      'link:a-f': {
        kind: 'link',
        scene: 'scene:root',
        link: { id: 'a-f', type: 'line', z: 'a1', source: { node: 'a' }, target: { node: 'f' } },
      },
    };
    expect(hasLegacyRoot(content)).toBe(true);
    expect(migrateContent(content)).toBe(true);
    expect(hasLegacyRoot(content)).toBe(false);
    expect(rootOf(content)).toBe(ROOT_VIEW_ID);
    expect(content['scene:scene:root']).toBeUndefined();
    expect(content['scene:root']).toEqual({ kind: 'scene', id: 'root', name: 'Root' });

    const scenes = readViews(content);
    expect(Object.keys(scenes[ROOT_VIEW_ID].nodes).sort()).toEqual(['a', 'f']);
    expect(Object.keys(scenes[ROOT_VIEW_ID].links)).toEqual(['a-f']);
    expect(scenes.f.nodes.up).toMatchObject({ scene: 'root' });
    // Already migrated: nothing more to do.
    expect(migrateContent(content)).toBe(false);
  });

  test("a canvas saved before layers names its layers and every element's on load", ({ expect }) => {
    const top = { id: 'top', name: 'Top', z: 'a5' };
    const content: ContentMap = {
      'canvas': { kind: 'canvas', root: ROOT_VIEW_ID },
      'scene:root': { kind: 'scene', id: ROOT_VIEW_ID },
      // A scene with layers whose elements name none, or one it lacks.
      'scene:f': { kind: 'scene', id: 'f', layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER, top } },
      'node:a': { kind: 'node', scene: ROOT_VIEW_ID, node: { id: 'a', type: 'rect', ...box } },
      'node:b': { kind: 'node', scene: 'f', node: { id: 'b', type: 'rect', ...box } },
      'node:c': { kind: 'node', scene: 'f', node: { id: 'c', type: 'rect', layer: 'gone', ...box } },
      'node:d': { kind: 'node', scene: 'f', node: { id: 'd', type: 'rect', layer: 'top', ...box } },
      'link:a-a': {
        kind: 'link',
        scene: ROOT_VIEW_ID,
        link: { id: 'a-a', type: 'line', z: 'a1', source: { node: 'a' }, target: { point: { x: 0, y: 0 } } },
      },
    };
    expect(hasUnplacedLayers(content)).toBe(true);
    expect(migrateLayers(content)).toBe(true);
    expect(hasUnplacedLayers(content)).toBe(false);

    const scenes = readViews(content);
    expect(scenes[ROOT_VIEW_ID].layers).toEqual({ [DEFAULT_LAYER.id]: DEFAULT_LAYER });
    expect(scenes[ROOT_VIEW_ID].nodes.a.layer).toBe(DEFAULT_LAYER.id);
    expect(scenes[ROOT_VIEW_ID].links['a-a'].layer).toBe(DEFAULT_LAYER.id);
    // Each element keeps the layer it was drawn on: the bottom one, unless it names one its scene has.
    expect([scenes.f.nodes.b.layer, scenes.f.nodes.c.layer, scenes.f.nodes.d.layer]).toEqual([
      DEFAULT_LAYER.id,
      DEFAULT_LAYER.id,
      'top',
    ]);
    // Already migrated: nothing more to do.
    expect(migrateLayers(content)).toBe(false);
  });

  test('the drawing settings live on the canvas record and survive scene writes', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    updateCanvasRecord(content, { lattice: true, grid: 24 });
    writeViews(content, readViews(content));
    expect(canvasRecordOf(content)).toEqual({ kind: 'canvas', root: ROOT_VIEW_ID, lattice: true, grid: 24 });
    // An unset value removes its key rather than storing `undefined`.
    updateCanvasRecord(content, { grid: undefined });
    expect(canvasRecordOf(content)).toEqual({ kind: 'canvas', root: ROOT_VIEW_ID, lattice: true });
  });

  test("a drawing's theme wins over the user's default, and its overrides over the theme's parts", ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    updateCanvasRecord(content, { theme: 'paper', styleSet: 'flat' });
    const record = canvasRecordOf(content);
    expect(resolveDrawingLook(record, { theme: 'glass-night' })).toEqual({
      theme: 'paper',
      defaultTheme: 'glass-night',
      styleSet: 'flat',
      background: undefined,
      backgroundGrid: undefined,
    });
    expect(resolveDrawingLook(undefined, {}).theme).toBeUndefined();
    updateCanvasRecord(content, { theme: undefined, styleSet: undefined });
    expect(canvasRecordOf(content)).toEqual({ kind: 'canvas', root: ROOT_VIEW_ID });
  });

  test('a link saved with a line reads it as its style', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_VIEW_ID,
      link: {
        type: 'line',
        id: 'l',
        z: 'a',
        source: { point: { x: 0, y: 0 } },
        target: { point: { x: 1, y: 0 } },
        line: { hue: 'red', dash: 'dotted' },
      },
    };
    const link = readViews(content)[ROOT_VIEW_ID].links.l;
    expect(link.style).toEqual({ hue: 'red', lineStyle: 'dotted' });
    expect('line' in link).toBe(false);
  });

  test('a link saved as directed reads as an arrow at its end', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_VIEW_ID,
      link: {
        type: 'line',
        id: 'l',
        z: 'a',
        source: { point: { x: 0, y: 0 } },
        target: { point: { x: 1, y: 0 } },
        directed: true,
      },
    };
    const link = readViews(content)[ROOT_VIEW_ID].links.l;
    expect(link.ends).toEqual({ end: 'arrow' });
    expect('directed' in link).toBe(false);
  });

  test('a deleted style class leaves its look on the elements that took it', ({ expect }) => {
    const frame = { center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };
    const content: ContentMap = {};
    seedContent(content);
    const node = (id: string, values: object) => ({
      kind: 'node',
      scene: ROOT_VIEW_ID,
      node: { id, type: 'rect', z: 'a0', ...frame, ...values },
    });
    content['node:a'] = node('a', { class: 'warn', style: { rounded: true } });
    content['node:b'] = node('b', { class: 'warn' });
    content['node:c'] = node('c', {});
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_VIEW_ID,
      link: { id: 'l', type: 'line', z: 'a0', source: { node: 'a' }, target: { node: 'b' }, class: 'warn' },
    };
    const styles: Record<string, unknown> = {
      warn: { id: 'warn', name: 'Warning', style: { hue: 'red', lineStyle: 'dashed', rounded: true } },
    };
    expect(styleClassUses(content)).toEqual({ warn: 3 });

    deleteStyleClass(content, styles, 'warn');
    expect(styles).toEqual({});
    expect(styleClassUses(content)).toEqual({});
    const { nodes, links } = readViews(content)[ROOT_VIEW_ID];
    expect(nodes.a.style).toEqual({ hue: 'red', lineStyle: 'dashed', rounded: true });
    expect(nodes.b.style).toEqual({ hue: 'red', lineStyle: 'dashed', rounded: true });
    expect(nodes.c.style).toBeUndefined();
    // A link keeps only the common base of the class's style.
    expect(links.l.style).toEqual({ hue: 'red', lineStyle: 'dashed' });
  });

  test('writing classes keeps a record this host cannot read', ({ expect }) => {
    // A record that fails this host's schema (a newer host's) never reaches the view, so its absence there is no delete.
    const target: Record<string, unknown> = {
      removed: { id: 'removed', name: 'Removed' },
      unreadable: { id: 'unreadable', title: 'Written by a newer host' },
    };
    writeStyles(target, { kept: { id: 'kept', name: 'Kept' } });
    expect(Object.keys(target).sort()).toEqual(['kept', 'unreadable']);
  });

  test("a scene's layers are kept with its record", ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    const scenes = readViews(content);
    const layers = { top: { id: 'top', name: 'Top', z: 'V' } };
    writeViews(content, { ...scenes, [ROOT_VIEW_ID]: { ...scenes[ROOT_VIEW_ID], layers } });
    expect(readViews(content)[ROOT_VIEW_ID].layers).toEqual(layers);
  });

  test("an anonymous Object's mark survives a write and a read", ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    const group = { id: 'g', name: 'Group 1', kind: 'composite' as const, anonymous: true, nodes: {}, links: {} };
    writeViews(content, { ...readViews(content), g: group });
    expect(readViews(content).g).toMatchObject({ kind: 'composite', anonymous: true });
  });

  test('scenes nothing reaches from the root are removed on load, with their elements; named Objects stay', ({
    expect,
  }) => {
    const content: ContentMap = {};
    seedContent(content);
    const rect = (id: string) => ({ id, type: 'rect', ...box });
    const portal: ViewNode = { id: 'v', type: 'view', scene: 'kept', ...box };
    const instance: InstanceNode = { id: 'i', type: 'instance', composite: 'group', ...box };
    writeViews(content, {
      ...readViews(content),
      [ROOT_VIEW_ID]: {
        id: ROOT_VIEW_ID,
        nodes: { v: portal },
        links: {},
      },
      kept: { id: 'kept', nodes: { i: instance }, links: {} },
      group: { id: 'group', kind: 'composite', anonymous: true, nodes: { a: rect('a') }, links: {} },
      stray: { id: 'stray', nodes: { s: rect('s') }, links: {} },
      lost: { id: 'lost', kind: 'composite', anonymous: true, nodes: { l: rect('l') }, links: {} },
      named: { id: 'named', kind: 'composite', name: 'Named', nodes: { n: rect('n') }, links: {} },
    });
    expect(orphanedViews(content).sort()).toEqual(['lost', 'stray']);
    expect(pruneOrphanedViews(content)).toBe(true);
    expect(Object.keys(readViews(content)).sort()).toEqual(['group', 'kept', 'named', ROOT_VIEW_ID]);
    expect(content[nodeKey('s')]).toBeUndefined();
    expect(content[nodeKey('l')]).toBeUndefined();
    expect(pruneOrphanedViews(content)).toBe(false);
  });
});
