//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type NodeBase } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type Intent, createMemoryStore, storeVersions } from '../model/index.ts';
import { type HistoryContext, createLocalHistory, createLocalStacks, withHistory } from './history.ts';
import { type Projection, createFreehandProjection } from './projection.ts';
import { type ConstrainedModel, createConstrainedProjection } from './projections/index.ts';

const box = (id: string, x = 0): NodeBase => ({
  id,
  type: 'rect',
  z: 'a0',
  center: { x, y: 0 },
  size: { width: 64, height: 64 },
});

const setup = () => {
  const registry = Registry.make();
  const store = createMemoryStore([{ id: 'root', nodes: { a: box('a') }, links: {} }]);
  let clock = 0;
  const restored: HistoryContext[] = [];
  let context: HistoryContext = { path: ['root'], selection: ['a'] };
  const history = createLocalHistory({ now: () => clock })({
    registry,
    store: storeVersions(registry, store),
    context: () => context,
    view: { restore: (entry) => restored.push(entry) },
  });
  const projection = withHistory(createFreehandProjection({ registry, store, sceneId: 'root' }), history);
  history.view.projection = projection;
  const x = () => registry.get(store.views).root?.nodes.a?.center.x;
  const move = (dx: number): Intent => ({ kind: 'move', ids: ['a'], delta: { x: dx, y: 0 } });
  return {
    registry,
    store,
    history,
    projection,
    restored,
    x,
    move,
    tick: (ms: number) => (clock += ms),
    setContext: (next: HistoryContext) => (context = next),
  };
};

describe('local history', () => {
  test('each intent is an undo step; undo and redo patch it back and forth', ({ expect }) => {
    const { registry, history, projection, x, move } = setup();
    projection.apply(move(10));
    projection.apply(move(5));
    expect(x()).toBe(15);
    expect(registry.get(history.state)).toEqual({ canUndo: true, canRedo: false });
    expect(history.undo()).toBe(true);
    expect(x()).toBe(10);
    expect(history.undo()).toBe(true);
    expect(x()).toBe(0);
    expect(history.undo()).toBe(false);
    expect(registry.get(history.state)).toEqual({ canUndo: false, canRedo: true });
    expect(history.redo()).toBe(true);
    expect(x()).toBe(10);
    projection.apply(move(1));
    expect(registry.get(history.state).canRedo).toBe(false);
  });

  test('a refused intent records nothing, and commits inside a commit are one step', ({ expect }) => {
    const { history, projection, x, move } = setup();
    expect(history.commit(() => projection.apply({ kind: 'delete', ids: ['missing'] }))).toBe(false);
    expect(history.undo()).toBe(false);
    history.commit(() => {
      projection.apply(move(10));
      projection.apply(move(5));
    });
    history.undo();
    expect(x()).toBe(0);
  });

  test('commits with one merge key inside the window fold into one step', ({ expect }) => {
    const { history, projection, x, move, tick } = setup();
    history.commit(() => projection.apply(move(1)), { mergeKey: 'nudge' });
    tick(300);
    history.commit(() => projection.apply(move(1)), { mergeKey: 'nudge' });
    tick(600);
    history.commit(() => projection.apply(move(1)), { mergeKey: 'nudge' });
    history.undo();
    expect(x()).toBe(2);
    history.undo();
    expect(x()).toBe(0);
    history.redo();
    expect(x()).toBe(2);
  });

  test('undo and redo return the view to where the edit was made', ({ expect }) => {
    const { history, projection, restored, move, setContext } = setup();
    setContext({ path: ['root', 'child'], selection: ['a'] });
    projection.apply(move(10));
    setContext({ path: ['root'], selection: [] });
    history.undo();
    history.redo();
    expect(restored).toEqual([
      { path: ['root', 'child'], selection: ['a'] },
      { path: ['root', 'child'], selection: ['a'] },
    ]);
  });

  test("a projection's own model is patched with the store", ({ expect }) => {
    const registry = Registry.make();
    const model = Atom.keepAlive(
      Atom.make<ConstrainedModel>({ nodes: [{ id: 'a', type: 'rect', label: 'A' }], constraints: [] }),
    );
    const store = createMemoryStore([]);
    const history = createLocalHistory()({
      registry,
      store: storeVersions(registry, store),
      context: () => ({ path: ['root'], selection: [] }),
      view: {},
    });
    let caughtUp = 0;
    const constrained = createConstrainedProjection({ registry, model, options: { nodes: defaultNodeRegistry } });
    const projection: Projection = withHistory({ ...constrained, restored: () => caughtUp++ }, history);
    history.view.projection = projection;
    projection.apply({ kind: 'update', id: 'a', values: { label: 'B' } });
    expect(registry.get(model).nodes[0].label).toBe('B');
    history.undo();
    expect(registry.get(model).nodes[0].label).toBe('A');
    expect(caughtUp).toBe(1);
  });

  test('stacks the host keeps outlive the view: a remounted view undoes the steps made before it', ({ expect }) => {
    const registry = Registry.make();
    const store = createMemoryStore([{ id: 'root', nodes: { a: box('a') }, links: {} }]);
    const stacks = createLocalStacks();
    const mount = () => {
      const history = createLocalHistory({ stacks })({
        registry,
        store: storeVersions(registry, store),
        context: () => ({ path: ['root'], selection: ['a'] }),
        view: { restore: () => {} },
      });
      const projection = withHistory(createFreehandProjection({ registry, store, sceneId: 'root' }), history);
      history.view.projection = projection;
      return { history, projection };
    };
    const x = () => registry.get(store.views).root?.nodes.a?.center.x;
    const first = mount();
    first.projection.apply({ kind: 'move', ids: ['a'], delta: { x: 10, y: 0 } });
    expect(x()).toBe(10);
    const second = mount();
    expect(registry.get(second.history.state).canUndo).toBe(true);
    expect(second.history.undo()).toBe(true);
    expect(x()).toBe(0);
    expect(second.history.redo()).toBe(true);
    expect(x()).toBe(10);
  });
});
