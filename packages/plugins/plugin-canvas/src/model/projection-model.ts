//
// Copyright 2026 DXOS.org
//

//
// The constrained and dynamic projections keep a model of their own (the constraints; the graph and its overlay) in
// atoms. Kept in the layout's props instead of in memory, that model persists with the arrangement it constrains,
// and the projection's undo, which patches the atom, patches the layout with it.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { Obj } from '@dxos/echo';
import type { ConstrainedModel, GraphModel, Overlay } from '@dxos/react-ui-canvas';
import { type Scene } from '@dxos/scene';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const isConstrainedModel = (value: unknown): value is ConstrainedModel =>
  isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.constraints);

export const isGraphModel = (value: unknown): value is GraphModel =>
  isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges);

export const isOverlay = (value: unknown): value is Overlay => isRecord(value) && isRecord(value.positions);

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const readAt = (props: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), props);

/** `props` with `value` at `path`, copying the records along it. */
const writeAt = (props: unknown, [key, ...rest]: readonly string[], value: unknown): Record<string, unknown> => {
  const record = isRecord(props) ? props : {};
  return key === undefined
    ? record
    : { ...record, [key]: rest.length === 0 ? value : writeAt(record[key], rest, value) };
};

/**
 * An atom over the value at `path` in `layout.props`: it starts at the stored value (`initial` when there is none, or
 * it is not a model `accept` takes), writes each change back to the layout, and follows edits made elsewhere.
 */
export const layoutModelAtom = <M>(
  registry: Registry.AtomRegistry,
  layout: Scene.Layout2D,
  path: readonly [string, ...string[]],
  accept: (value: unknown) => value is M,
  initial: M,
): { atom: Atom.Writable<M>; dispose: () => void } => {
  const stored = readAt(layout.props, path);
  const atom = Atom.keepAlive(Atom.make<M>(accept(stored) ? plain(stored) : initial));
  let writing = false;
  const unsubscribeAtom = registry.subscribe(atom, (next) => {
    if (same(readAt(layout.props, path), next)) {
      return;
    }
    writing = true;
    try {
      Obj.update(layout, (layout) => {
        layout.props = writeAt(plain({ ...layout.props }), path, plain(next));
      });
    } finally {
      writing = false;
    }
  });
  const unsubscribeLayout = Obj.subscribe(layout, () => {
    const next = readAt(layout.props, path);
    if (!writing && accept(next) && !same(next, registry.get(atom))) {
      registry.set(atom, plain(next));
    }
  });
  // The atom is read once so its subscription sees every later write.
  registry.get(atom);
  return {
    atom,
    dispose: () => {
      unsubscribeAtom();
      unsubscribeLayout();
    },
  };
};
