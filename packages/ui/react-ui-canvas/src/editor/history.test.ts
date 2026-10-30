//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { atomSource, writePath } from '../model/index.ts';
import { createHistory, sessionHistory, sessionStacks } from './history.ts';

type Layouts = Record<string, { elements: Record<string, { label?: string; center?: { x: number; y: number } }> }>;

const isLayouts = (value: unknown): value is Layouts => typeof value === 'object' && value !== null;

const setup = () => {
  const registry = Registry.make();
  const layouts = Atom.make<Layouts>({ root: { elements: { a: { label: 'A', center: { x: 0, y: 0 } } } } });
  const source = atomSource(registry, layouts, isLayouts);
  const write = (path: string[], value: unknown) => {
    const next = writePath(registry.get(layouts), path, value);
    isLayouts(next) && registry.set(layouts, next);
  };
  const history = createHistory({ steps: { done: [], undone: [] }, source });
  return { registry, layouts, write, history };
};

describe('createHistory', () => {
  test('undo and redo move a recorded edit back and forward', () => {
    const { registry, layouts, write, history } = setup();
    expect(history.record(() => write(['root', 'elements', 'a', 'center'], { x: 5, y: 0 }))).toBe(true);
    expect(history.canUndo).toBe(true);
    history.undo();
    expect(registry.get(layouts).root.elements.a.center).toEqual({ x: 0, y: 0 });
    expect(history.canRedo).toBe(true);
    history.redo();
    expect(registry.get(layouts).root.elements.a.center).toEqual({ x: 5, y: 0 });
  });

  test('undo after a peer edited another field keeps the peer field', () => {
    const { registry, layouts, write, history } = setup();
    history.record(() => write(['root', 'elements', 'a', 'center'], { x: 5, y: 0 }));
    // A peer's edit arrives outside the history: it is no step of ours.
    write(['root', 'elements', 'a', 'label'], 'Peer');
    history.undo();
    expect(registry.get(layouts).root.elements.a).toEqual({ label: 'Peer', center: { x: 0, y: 0 } });
  });

  test("undo leaves a field a peer changed since the step, rather than overwrite the peer's value", () => {
    const { registry, layouts, write, history } = setup();
    history.record(() => write(['root', 'elements', 'a', 'label'], 'Mine'));
    write(['root', 'elements', 'a', 'label'], 'Peer');
    history.undo();
    expect(registry.get(layouts).root.elements.a.label).toBe('Peer');
  });

  test('a change that writes nothing records no step', () => {
    const { history } = setup();
    expect(history.record(() => {})).toBe(false);
    expect(history.canUndo).toBe(false);
  });

  test('a new step clears the redo stack', () => {
    const { write, history } = setup();
    history.record(() => write(['root', 'elements', 'a', 'label'], 'B'));
    history.undo();
    history.record(() => write(['root', 'elements', 'a', 'label'], 'C'));
    expect(history.canRedo).toBe(false);
  });

  test('a model edit is undone by writing the document from before it back', () => {
    const written: unknown[] = [];
    const registry = Registry.make();
    const source = atomSource(registry, Atom.make<Layouts>({}), isLayouts);
    const history = createHistory({
      steps: { done: [], undone: [] },
      source,
      writeDocument: (document) => written.push(document),
    });
    const before = { scenes: [], layouts: [], models: [] };
    const after = { scenes: [], layouts: [], models: [{ id: 'm', dim: '3d' as const, objects: {} }] };
    history.recordDocument(before, after);
    history.undo();
    history.redo();
    expect(written).toEqual([before, after]);
  });
});

describe('sessionHistory', () => {
  test("a canvas's history outlives the editor: reopening finds the same steps", () => {
    const canvas = {};
    sessionHistory(canvas).done.push({ before: 'a', after: 'b', paths: [] });
    expect(sessionHistory(canvas).done).toHaveLength(1);
    expect(sessionHistory({}).done).toEqual([]);
  });

  test("a 2D canvas keeps its engine's undo stacks for the session, one pair per canvas", () => {
    const one = {};
    expect(sessionStacks(one)).toBe(sessionStacks(one));
    expect(sessionStacks(one)).not.toBe(sessionStacks({}));
  });
});
