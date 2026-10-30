//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type Timeline, createTimeline, keyTimes } from '@dxos/animation';
import { isInstanceNode, isViewNode } from '@dxos/scene';

import { ViewBuilder, type ViewTree } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { type BackgroundGrid, createMemoryStore, storeVersions } from '../model/index.ts';
import { createCanvasAtoms } from './atoms.ts';
import { type LookHandlers, createCanvasController } from './controller.ts';
import { createLocalHistory, withHistory } from './history.ts';
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
  const history = createLocalHistory()({
    registry,
    store: storeVersions(registry, store),
    context: () => ({ path: registry.get(atoms.path), selection: [...registry.get(atoms.selection)] }),
    view: {},
  });
  const projection = withHistory(createFreehandProjection({ registry, store, sceneId: tree.root }), history);
  // The host's timeline: what a canvas animates is held outside its Views.
  let timeline: Timeline | undefined;
  const setTimeline = (next: Timeline) => {
    timeline = next;
  };
  let next = 0;
  const controller = createCanvasController({
    registry,
    atoms,
    store,
    projection: () => projection,
    baseProjection: () => projection,
    timeline: () => timeline,
    onTimelineChange: () => setTimeline,
    nodeRegistry: () => defaultNodeRegistry,
    readonly: () => readonly,
    grid: () => ({ major: 64, snap: (value) => Math.round(value / 16) * 16 }),
    viewport: () => VIEWPORT,
    inset: () => 0,
    look: () => look,
    history: () => history,
    createId: (prefix) => `${prefix}-${next++}`,
  });
  history.view.restore = ({ path, selection }) =>
    controller.navigation.openView(path, { animate: false, select: selection });
  const scene = () => registry.get(projection.scene);
  const linkId = Object.keys(scene().links)[0];
  const views = () => registry.get(store.views);
  return {
    registry,
    store,
    atoms,
    controller,
    scene,
    views,
    linkId,
    projection,
    timeline: () => timeline,
    setTimeline,
    history,
    undoStep: history.undo,
    redoStep: history.redo,
  };
};

/** The Object the one Instance in the open View draws. */
const groupedObject = ({ scene }: ReturnType<typeof setup>) =>
  Object.values(scene().nodes).flatMap((node) => (isInstanceNode(node) ? [node.composite] : []))[0];

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

    test('openPlace selects inside an object opened on its own, and a plain path leaves isolation', ({ expect }) => {
      const { registry, atoms, controller } = setup({ tree: nested() });
      controller.navigation.openPlace({ path: ['child'], isolate: 'child' }, { animate: false, select: ['c'] });
      expect(registry.get(atoms.isolation)?.composite).toBe('child');
      expect(registry.get(atoms.path)).toEqual(['child']);
      expect([...registry.get(atoms.selection)]).toEqual(['c']);
      controller.navigation.openPlace({ path: ['root'] }, { animate: false, select: ['a'] });
      expect(registry.get(atoms.isolation)).toBeUndefined();
      expect([...registry.get(atoms.selection)]).toEqual(['a']);
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

    test("restack in another container (an Object's definition) writes the store, as one undo step", ({ expect }) => {
      const tree = ViewBuilder.view('root', [
        ViewBuilder.rect('a', box(0)),
        ViewBuilder.view('child', [ViewBuilder.rect('c', box(0)), ViewBuilder.rect('d', box(512))])
          .name('Child')
          .at({ x: 512, y: 0, width: 512, height: 256 }),
      ]).build();
      const { registry, store, controller, history } = setup({ tree });
      const order = () =>
        Object.values(registry.get(store.views).child.nodes)
          .sort((left, right) => (left.z < right.z ? -1 : 1))
          .map((node) => node.id);
      expect(order()).toEqual(['c', 'd']);
      expect(controller.document.restack('child', 'd', 'c', 'before')).toBe(true);
      expect(order()).toEqual(['d', 'c']);
      history.undo();
      expect(order()).toEqual(['c', 'd']);
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

    test('group writes an anonymous Object and one Instance in place of the selection, as one undo step', ({
      expect,
    }) => {
      const view = setup();
      const { registry, atoms, controller, scene, views, undoStep, redoStep } = view;
      controller.selection.select(['a', 'b']);
      const id = controller.selection.group();
      expect(id).toBe('instance-0');
      const node = id === undefined ? undefined : scene().nodes[id];
      expect(node && isInstanceNode(node) ? node.composite : undefined).toBe('object-1');
      expect(views()['object-1']).toMatchObject({ kind: 'composite', anonymous: true, name: 'Group 1' });
      expect(Object.keys(views()['object-1'].nodes).sort()).toEqual(['a', 'b']);
      expect(scene().nodes.a).toBeUndefined();
      expect([...registry.get(atoms.selection)]).toEqual([id]);

      expect(undoStep()).toBe(true);
      expect(scene().nodes.a).toBeDefined();
      expect(views()['object-1']).toBeUndefined();
      expect(redoStep()).toBe(true);
      expect(groupedObject(view)).toBe('object-1');
      expect(views()['object-1']).toBeDefined();
    });

    test('group refuses a read-only canvas and a selection with no node', ({ expect }) => {
      const view = setup({ readonly: true });
      view.registry.set(view.atoms.selection, new Set(['a']));
      expect(view.controller.selection.group()).toBeUndefined();
      const { controller, linkId, views } = setup();
      controller.selection.select([linkId]);
      expect(controller.selection.group()).toBeUndefined();
      expect(Object.keys(views())).toEqual(['root']);
    });

    test('group refuses a selection holding a view node, since an Object cannot contain a View', ({ expect }) => {
      const { controller, scene, views } = setup({ tree: nested() });
      controller.selection.select(['a', 'child']);
      expect(controller.selection.group()).toBeUndefined();
      expect(scene().nodes.child).toBeDefined();
      expect(Object.values(views()).some((view) => view.kind === 'composite')).toBe(false);
    });

    test("ungroup puts an anonymous Object's contents back where they were and deletes its definition", ({
      expect,
    }) => {
      const view = setup();
      const { registry, atoms, controller, scene, views, undoStep } = view;
      const centres = { a: scene().nodes.a.center, b: scene().nodes.b.center };
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      const created = controller.selection.ungroup();
      expect(created).toHaveLength(2);
      expect(created.map((id) => scene().nodes[id].center)).toEqual([centres.a, centres.b]);
      expect(Object.values(scene().nodes).some(isInstanceNode)).toBe(false);
      expect(Object.keys(views())).toEqual(['root']);
      expect([...registry.get(atoms.selection)]).toEqual(created);

      // One step: the Instance and its definition come back together.
      expect(undoStep()).toBe(true);
      expect(groupedObject(view)).toBe('object-1');
      expect(views()['object-1']).toMatchObject({ anonymous: true });
    });

    test("ungroup on a named Object's Instance explodes that Instance only and keeps the definition", ({ expect }) => {
      const view = setup();
      const { registry, store, controller, scene, views, undoStep } = view;
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      const { anonymous: _, ...named } = views()['object-1'];
      registry.set(store.views, { ...views(), 'object-1': { ...named, name: 'Pair' } });
      expect(controller.selection.ungroup()).toHaveLength(2);
      expect(Object.values(scene().nodes).some(isInstanceNode)).toBe(false);
      expect(views()['object-1']).toMatchObject({ name: 'Pair' });
      expect(undoStep()).toBe(true);
      expect(groupedObject(view)).toBe('object-1');
    });

    test('ungroup with no Instance selected does nothing', ({ expect }) => {
      const { controller, scene } = setup();
      const before = scene();
      controller.selection.select(['a']);
      expect(controller.selection.ungroup()).toEqual([]);
      expect(scene()).toBe(before);
    });

    test("deleting an anonymous Object's last Instance deletes the definition; undo restores both", ({ expect }) => {
      const view = setup();
      const { controller, views, undoStep } = view;
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      controller.editing.paste();
      expect(controller.selection.delete()).toBe(true);
      expect(views()['object-1']).toBeUndefined();
      expect(undoStep()).toBe(true);
      expect(groupedObject(view)).toBe('object-1');
      expect(views()['object-1']).toMatchObject({ anonymous: true });
    });

    test('a named Object with no Instances stays, as a library entry', ({ expect }) => {
      const { registry, store, controller, views } = setup();
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      const { anonymous: _, ...named } = views()['object-1'];
      registry.set(store.views, { ...views(), 'object-1': named });
      controller.selection.delete();
      expect(views()['object-1']).toBeDefined();
    });

    test('deleting the view node that opens a View deletes the View and the Views inside it; undo restores them', ({
      expect,
    }) => {
      const { controller, scene, views, undoStep } = setup({ tree: deep() });
      controller.selection.select(['child']);
      expect(controller.selection.delete()).toBe(true);
      expect(Object.keys(views())).toEqual(['root']);
      expect(undoStep()).toBe(true);
      expect(Object.keys(views()).sort()).toEqual(['child', 'grand', 'root']);
      const node = scene().nodes.child;
      expect(node && isViewNode(node) ? node.scene : undefined).toBe('child');
    });

    test('deleting one of two view nodes onto a View keeps the View', ({ expect }) => {
      const { controller, views } = setup({ tree: nested() });
      controller.selection.select(['child']);
      controller.editing.copy();
      controller.editing.paste();
      controller.selection.select(['child']);
      controller.selection.delete();
      expect(views().child).toBeDefined();
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

    test('pasting an Instance of an anonymous Object places it again, so it joins the library; one undo step', ({
      expect,
    }) => {
      const { controller, views, undoStep } = setup();
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      controller.editing.copy();
      controller.editing.paste();
      expect(views()['object-1'].anonymous).toBeUndefined();
      expect(undoStep()).toBe(true);
      expect(views()['object-1'].anonymous).toBe(true);
    });

    test('duplicating an Instance of an anonymous Object places it again, so it joins the library', ({ expect }) => {
      const { controller, scene, views } = setup();
      controller.selection.select(['a', 'b']);
      const id = controller.selection.group();
      expect(id && controller.document.duplicate([id], { x: 512, y: 0 })).toBe(true);
      expect(Object.values(scene().nodes).filter(isInstanceNode)).toHaveLength(2);
      expect(views()['object-1'].anonymous).toBeUndefined();
    });

    test('cut then paste of an Instance moves it: its anonymous Object comes back, still anonymous', ({ expect }) => {
      const view = setup();
      const { controller, views } = view;
      controller.selection.select(['a', 'b']);
      controller.selection.group();
      controller.editing.cut();
      expect(views()['object-1']).toBeUndefined();
      controller.editing.paste();
      expect(groupedObject(view)).toBe('object-1');
      expect(views()['object-1']).toMatchObject({ anonymous: true });
      // A second paste is a second placement.
      controller.editing.paste();
      expect(views()['object-1'].anonymous).toBeUndefined();
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
      const { registry, atoms, controller, setTimeline } = setup();
      setTimeline(createTimeline(4));
      registry.set(atoms.clock.playing, true);
      controller.time.seek(10);
      expect(registry.get(atoms.clock.playing)).toBe(false);
      expect(registry.get(atoms.clock.time)).toBe(4);
      controller.time.togglePlay();
      expect(registry.get(atoms.clock.time)).toBe(0);
      expect(registry.get(atoms.clock.playing)).toBe(true);
    });

    test('addKey keys the selection at the playhead, and removeKey takes those keys away', ({ expect }) => {
      const { controller, timeline, setTimeline } = setup();
      setTimeline(createTimeline(4));
      controller.selection.select(['a']);
      controller.time.seek(1);
      controller.time.addKey();
      const keyed = () => keyTimes(timeline(), ['a']);
      expect(keyed()).toEqual([1]);
      controller.time.removeKey();
      expect(keyed()).toEqual([]);
    });

    test('moveKey moves the selection keys at one time to another, with the playhead', ({ expect }) => {
      const { registry, atoms, controller, timeline, setTimeline } = setup();
      setTimeline(createTimeline(4));
      controller.selection.select(['a']);
      controller.time.seek(1);
      controller.time.addKey();
      controller.time.moveKey(1, 3);
      expect(keyTimes(timeline(), ['a'])).toEqual([3]);
      expect(registry.get(atoms.clock.time)).toBe(3);
    });
  });
});
