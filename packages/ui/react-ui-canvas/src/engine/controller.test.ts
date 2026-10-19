//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { ViewBuilder, type ViewTree } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { type BackgroundGrid, createMemoryStore, createTimeline, isViewNode, keyTimes } from '../model/index.ts';
import { createCanvasAtoms } from './atoms.ts';
import { type LookHandlers, createCanvasController } from './controller.ts';
import { createFreehandProjection } from './projection.ts';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

const VIEWPORT = { width: 1024, height: 768 };

/** Two rectangles and a link between them, on a store with no classes yet. */
const flat = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)).properties({ label: 'A' }),
    ViewBuilder.rect('b', box(512)).properties({ label: 'B' }),
    ViewBuilder.link('line', 'a', 'b'),
  ]).build();

/** A rectangle beside a frame onto a child scene with one rectangle of its own. */
const nested = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)),
    ViewBuilder.view('child', [ViewBuilder.rect('c', box(0))])
      .name('Child')
      .at({ x: 512, y: 0, width: 512, height: 256 }),
  ]).build();

/** Root holds A and a frame onto Child; Child holds C and a frame onto Grand, which holds G. */
const deep = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)),
    ViewBuilder.view('child', [
      ViewBuilder.rect('c', box(0)),
      ViewBuilder.view('grand', [ViewBuilder.rect('g', box(0))]).at({ x: 512, y: 0, width: 512, height: 256 }),
    ]).at({ x: 512, y: 0, width: 512, height: 256 }),
  ]).build();

const setup = ({
  readonly = false,
  tree = flat(),
  look = {},
}: { readonly?: boolean; tree?: ViewTree; look?: LookHandlers } = {}) => {
  const registry = Registry.make();
  const store = createMemoryStore(tree.views);
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
    viewport: () => VIEWPORT,
    inset: () => 0,
    look: () => look,
    createId: (prefix) => `${prefix}-${next++}`,
  });
  const scene = () => registry.get(projection.scene);
  const linkId = Object.keys(scene().links)[0];
  return { registry, store, atoms, controller, scene, linkId, projection };
};

describe('CanvasController', () => {
  describe('navigation', () => {
    test("drillIn opens a frame's scene, records it in the history and clears the selection", ({ expect }) => {
      const { registry, atoms, controller, scene } = setup({ tree: nested() });
      controller.selection.select(['a']);
      controller.navigation.drillIn(scene().nodes.child);
      expect(registry.get(atoms.path)).toEqual(['root', 'child']);
      expect(registry.get(atoms.selection).size).toBe(0);
      const history = registry.get(atoms.history);
      expect(history.entries.map((entry) => entry.path)).toEqual([['root', 'child']]);
      expect(registry.get(atoms.camera)).toEqual(history.entries[0].camera);
    });

    test('drillOut and openPath return to the parent through the frame the child was entered with', ({ expect }) => {
      const { registry, store, atoms, controller, scene } = setup({ tree: nested() });
      const portal = scene().nodes.child;
      const before = { x: 10, y: 20, zoom: 0.5 };
      registry.set(atoms.camera, before);
      controller.navigation.drillIn(portal, false);
      const child = registry.get(store.views).child;
      expect(controller.navigation.frame(registry.get(atoms.path), child)).toEqual(
        controller.navigation.childFrame(portal, child),
      );
      controller.navigation.drillOut(1, false);
      expect(registry.get(atoms.path)).toEqual(['root']);
      const after = registry.get(atoms.camera);
      expect([after.x, after.y, after.zoom].map((value) => Math.round(value * 1e6) / 1e6)).toEqual([10, 20, 0.5]);
      controller.navigation.drillIn(portal, false);
      controller.navigation.openPath(0);
      expect(registry.get(atoms.path)).toEqual(['root']);
    });

    test('openView drills down a path, across to a sibling branch, and selects there', ({ expect }) => {
      const { registry, atoms, controller } = setup({ tree: deep() });
      controller.navigation.openView(['root', 'child', 'grand'], { animate: false, select: ['g'] });
      expect(registry.get(atoms.path)).toEqual(['root', 'child', 'grand']);
      expect([...registry.get(atoms.selection)]).toEqual(['g']);
      controller.navigation.openView(['root', 'child'], { animate: false, select: ['c'] });
      expect(registry.get(atoms.path)).toEqual(['root', 'child']);
      expect([...registry.get(atoms.selection)]).toEqual(['c']);
      controller.navigation.openView(['root'], { animate: false });
      expect(registry.get(atoms.path)).toEqual(['root']);
      // A path from another root, or through a frame that is not there, goes no further than it can.
      controller.navigation.openView(['other'], { animate: false });
      expect(registry.get(atoms.path)).toEqual(['root']);
      controller.navigation.openView(['root', 'grand'], { animate: false });
      expect(registry.get(atoms.path)).toEqual(['root']);
    });

    test('openView leaves isolation first', ({ expect }) => {
      const { registry, atoms, controller } = setup({ tree: deep() });
      controller.navigation.isolate('grand');
      controller.navigation.openView(['root', 'child'], { animate: false });
      expect(registry.get(atoms.isolation)).toBeUndefined();
      expect(registry.get(atoms.path)).toEqual(['root', 'child']);
    });

    test('goHistory moves back and forward along the visited paths', ({ expect }) => {
      const { registry, atoms, controller, scene } = setup({ tree: nested() });
      controller.navigation.drillIn(scene().nodes.child, false);
      controller.navigation.drillOut(1, false);
      controller.navigation.goHistory(-1);
      expect(registry.get(atoms.path)).toEqual(['root', 'child']);
      controller.navigation.goHistory(1);
      expect(registry.get(atoms.path)).toEqual(['root']);
      controller.navigation.goHistory(1);
      expect(registry.get(atoms.path)).toEqual(['root']);
    });

    test('isolate opens a scene on its own and back returns to where the view was', ({ expect }) => {
      const { registry, atoms, controller } = setup({ tree: nested() });
      const camera = { x: 10, y: 20, zoom: 2 };
      registry.set(atoms.camera, camera);
      controller.navigation.isolate('child');
      expect(registry.get(atoms.path)).toEqual(['child']);
      expect(registry.get(atoms.isolation)?.composite).toBe('child');
      expect(registry.get(atoms.camera)).not.toEqual(camera);
      controller.navigation.back();
      expect(registry.get(atoms.isolation)).toBeUndefined();
      expect(registry.get(atoms.path)).toEqual(['root']);
      expect(registry.get(atoms.camera)).toEqual(camera);
    });

    test("zoomTo and zoomBy zoom about the view's centre; resetZoom returns to true size", ({ expect }) => {
      const { registry, atoms, controller } = setup();
      controller.navigation.zoomTo(2);
      expect(registry.get(atoms.camera).zoom).toBe(2);
      controller.navigation.zoomBy(2);
      expect(registry.get(atoms.camera).zoom).toBe(4);
      controller.navigation.resetZoom();
      expect(registry.get(atoms.camera).zoom).toBe(1);
    });

    test("fit frames the scene's shapes; fitSelection frames the selection", ({ expect }) => {
      const { registry, atoms, controller } = setup();
      // Both rectangles span x 0–768 and y 0–128; at most true size, each frame is centred in the 1024 × 768 view.
      controller.navigation.fit();
      expect(registry.get(atoms.camera)).toEqual({ zoom: 1, x: 128, y: 320 });
      controller.selection.select(['a']);
      controller.navigation.fitSelection();
      expect(registry.get(atoms.camera)).toEqual({ zoom: 1, x: 384, y: 320 });
    });
  });

  describe('document', () => {
    test("restack moves an element among its siblings in the open View's order, as one intent", ({ expect }) => {
      const { controller, scene, projection } = setup();
      const order = () =>
        Object.values(scene().nodes)
          .sort((left, right) => (left.z < right.z ? -1 : 1))
          .map((node) => node.id);
      expect(order()).toEqual(['a', 'b']);
      let applied = 0;
      const apply = projection.apply;
      projection.apply = (intent) => {
        applied++;
        apply(intent);
      };
      expect(controller.document.restack('root', 'b', 'a', 'before')).toBe(true);
      expect(order()).toEqual(['b', 'a']);
      expect(applied).toBe(1);
      // Another container, or a move that changes nothing, applies nothing.
      expect(controller.document.restack('child', 'b', 'a', 'before')).toBe(false);
      expect(controller.document.restack('root', 'b', 'a', 'before')).toBe(false);
      expect(applied).toBe(1);
    });

    test('restack changes nothing on a read-only canvas', ({ expect }) => {
      const { controller } = setup({ readonly: true });
      expect(controller.document.restack('root', 'b', 'a', 'before')).toBe(false);
    });
  });

  describe('look', () => {
    test("the look commands call the host's handlers, and do nothing without them", ({ expect }) => {
      const themes: (string | undefined)[] = [];
      const grids: (BackgroundGrid | undefined)[] = [];
      const { controller } = setup({
        look: { onThemeChange: (theme) => themes.push(theme), onBackgroundGridChange: (grid) => grids.push(grid) },
      });
      controller.look.setTheme('paper');
      controller.look.setTheme(undefined);
      controller.look.setBackgroundGrid('dots');
      expect(themes).toEqual(['paper', undefined]);
      expect(grids).toEqual(['dots']);
      expect(() => setup().controller.look.setTheme('paper')).not.toThrow();
    });
  });

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

    test('group moves the selection into a new View opened by a view node, which becomes the selection', ({
      expect,
    }) => {
      const { registry, store, atoms, controller, scene } = setup();
      controller.selection.select(['a', 'b']);
      const id = controller.selection.group();
      expect(id).toBe('view-0');
      const node = id === undefined ? undefined : scene().nodes[id];
      expect(node && isViewNode(node) ? node.scene : undefined).toBe(id);
      expect(scene().nodes.a).toBeUndefined();
      expect(id && registry.get(store.views)[id]?.nodes.a).toBeDefined();
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
    test('read-only: copy works, but paste, cut and delete change nothing', ({ expect }) => {
      const { registry, atoms, controller, scene } = setup({ readonly: true });
      // `select` refuses a read-only view, so the selection is set as a host would restore it.
      registry.set(atoms.selection, new Set(['a']));
      controller.editing.copy();
      expect(registry.get(atoms.clipboard)).toBeDefined();
      const before = scene();
      controller.editing.paste();
      controller.editing.cut();
      expect(controller.selection.delete()).toBe(false);
      expect(scene()).toBe(before);
    });

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

    test('moveKey moves the selection keys at one time to another, with the playhead', ({ expect }) => {
      const { registry, atoms, controller, projection } = setup();
      projection.apply({ kind: 'timeline', timeline: createTimeline(4) });
      controller.selection.select(['a']);
      controller.time.seek(1);
      controller.time.addKey();
      controller.time.moveKey(1, 3);
      expect(keyTimes(registry.get(projection.scene).timeline, ['a'])).toEqual([3]);
      expect(registry.get(atoms.clock.time)).toBe(3);
    });
  });
});
