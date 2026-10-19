//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { SceneBuilder } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { createMemoryStore, createTimeline, isFrameNode, keyTimes } from '../model/index.ts';
import { createCanvasAtoms } from './atoms.ts';
import { createCanvasController } from './controller.ts';
import { createFreehandProjection } from './projection.ts';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

/** Two rectangles and a link between them, on a store with no classes yet. */
const setup = ({ readonly = false } = {}) => {
  const tree = SceneBuilder.scene('root', [
    SceneBuilder.rect('a', box(0)).properties({ label: 'A' }),
    SceneBuilder.rect('b', box(512)).properties({ label: 'B' }),
    SceneBuilder.link('line', 'a', 'b'),
  ]).build();
  const registry = Registry.make();
  const store = createMemoryStore(tree.scenes);
  const atoms = createCanvasAtoms(tree.root);
  const projection = createFreehandProjection({ registry, store, sceneId: tree.root });
  let next = 0;
  const controller = createCanvasController({
    registry,
    atoms,
    store,
    projection: () => projection,
    baseProjection: () => projection,
    nodeRegistry: () => defaultNodeRegistry,
    readonly: () => readonly,
    grid: () => ({ major: 64, snap: (value) => Math.round(value / 16) * 16 }),
    createId: (prefix) => `${prefix}-${next++}`,
  });
  const scene = () => registry.get(projection.scene);
  const linkId = Object.keys(scene().links)[0];
  return { registry, store, atoms, controller, scene, linkId, projection };
};

describe('CanvasController', () => {
  describe('selection', () => {
    test('select sets the selection and clears the control point; read-only selects nothing', ({ expect }) => {
      const { registry, atoms, controller } = setup();
      registry.set(atoms.point, { link: 'l', index: 0 });
      controller.selection.select(['a']);
      expect([...registry.get(atoms.selection)]).toEqual(['a']);
      expect(registry.get(atoms.point)).toBeUndefined();

      const view = setup({ readonly: true });
      view.controller.selection.select(['a']);
      expect(view.registry.get(view.atoms.selection).size).toBe(0);
    });

    test('delete removes the selection and reports whether it did', ({ expect }) => {
      const { registry, atoms, controller, scene } = setup();
      expect(controller.selection.delete()).toBe(false);
      controller.selection.select(['a']);
      expect(controller.selection.delete()).toBe(true);
      expect(scene().nodes.a).toBeUndefined();
      expect(registry.get(atoms.selection).size).toBe(0);
    });

    test('group moves the selection into a new scene opened by a frame, which becomes the selection', ({ expect }) => {
      const { registry, store, atoms, controller, scene } = setup();
      controller.selection.select(['a', 'b']);
      const id = controller.selection.group();
      expect(id).toBe('scene-0');
      const frame = id === undefined ? undefined : scene().nodes[id];
      expect(frame && isFrameNode(frame) ? frame.scene : undefined).toBe(id);
      expect(scene().nodes.a).toBeUndefined();
      expect(id && registry.get(store.scenes)[id]?.nodes.a).toBeDefined();
      expect([...registry.get(atoms.selection)]).toEqual([id]);
    });

    test('classFrom makes a class from the one selected element, which then follows it', ({ expect }) => {
      const { registry, store, controller, scene } = setup();
      controller.selection.select(['a', 'b']);
      expect(controller.selection.classFrom()).toBeUndefined();
      controller.selection.select(['a']);
      const id = controller.selection.classFrom();
      expect(id).toBe('class-0');
      expect(id && store.styles && registry.get(store.styles)[id]?.name).toBe('Class 1');
      expect(scene().nodes.a).toMatchObject({ class: id });
    });
  });

  describe('editing', () => {
    test('copy then paste places a copy one major step away, and selects it', ({ expect }) => {
      const { registry, atoms, controller, scene } = setup();
      controller.selection.select(['a']);
      expect(controller.editing.copy()).toBe(true);
      controller.editing.paste();
      const added = Object.keys(scene().nodes).filter((id) => id !== 'a' && id !== 'b');
      expect(added).toHaveLength(1);
      expect(scene().nodes[added[0]].center).toEqual({
        x: scene().nodes.a.center.x + 64,
        y: scene().nodes.a.center.y + 64,
      });
      expect([...registry.get(atoms.selection)]).toEqual(added);
    });

    test('paste at a point puts the fragment there, snapped', ({ expect }) => {
      const { controller, scene } = setup();
      controller.selection.select(['a']);
      controller.editing.copy();
      controller.editing.paste({ x: 1001, y: 999 });
      const added = Object.values(scene().nodes).find((node) => node.id !== 'a' && node.id !== 'b');
      expect(added && { x: added.center.x - added.size.width / 2, y: added.center.y - added.size.height / 2 }).toEqual({
        x: 1008,
        y: 992,
      });
    });

    test('cut copies and deletes; copy with nothing selected copies nothing', ({ expect }) => {
      const { registry, atoms, controller, scene } = setup();
      expect(controller.editing.copy()).toBe(false);
      controller.selection.select(['b']);
      controller.editing.cut();
      expect(scene().nodes.b).toBeUndefined();
      expect(registry.get(atoms.clipboard)).toBeDefined();
    });
  });

  describe('tools', () => {
    test('a creation tool clears the selection and a link tool sets the link type', ({ expect }) => {
      const { registry, atoms, controller } = setup();
      controller.selection.select(['a']);
      controller.tools.setTool({ kind: 'select' });
      expect(registry.get(atoms.selection).size).toBe(1);
      controller.tools.setTool({ kind: 'link', type: 'curve' });
      expect(registry.get(atoms.selection).size).toBe(0);
      expect(registry.get(atoms.linkType)).toBe('curve');
    });

    test('the toggles flip their atoms', ({ expect }) => {
      const { registry, atoms, controller } = setup();
      const snap = registry.get(atoms.snap);
      controller.tools.toggleSnap();
      expect(registry.get(atoms.snap)).toBe(!snap);
      const debug = registry.get(atoms.debug);
      controller.tools.toggleDebug();
      expect(registry.get(atoms.debug)).toBe(!debug);
    });
  });

  describe('time', () => {
    test('seek pauses and keeps the playhead within the timeline; play at the end starts again', ({ expect }) => {
      const { registry, atoms, controller, projection } = setup();
      projection.apply({ kind: 'timeline', timeline: createTimeline(4) });
      registry.set(atoms.clock.playing, true);
      controller.time.seek(10);
      expect(registry.get(atoms.clock.playing)).toBe(false);
      expect(registry.get(atoms.clock.time)).toBe(4);
      controller.time.togglePlay();
      expect(registry.get(atoms.clock.time)).toBe(0);
      expect(registry.get(atoms.clock.playing)).toBe(true);
    });

    test('addKey keys the selection at the playhead, and removeKey takes those keys away', ({ expect }) => {
      const { registry, atoms, controller, projection } = setup();
      projection.apply({ kind: 'timeline', timeline: createTimeline(4) });
      controller.selection.select(['a']);
      controller.time.seek(1);
      controller.time.addKey();
      const keyed = () => keyTimes(registry.get(projection.scene).timeline, ['a']);
      expect(keyed()).toEqual([1]);
      controller.time.removeKey();
      expect(keyed()).toEqual([]);
    });
  });
});
