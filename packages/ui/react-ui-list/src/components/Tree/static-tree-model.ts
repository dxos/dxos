//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { Path } from '../../util';
import { type TreeItemDataProps, type TreeModel } from './TreeContext';

export type TreeNodeState = {
  open: boolean;
  current: boolean;
};

export type StaticTreeModelOptions<T extends { id: string }> = {
  /** Children of a node; `undefined` or empty marks a leaf. Required — there is no shape to guess. */
  getChildren: (item: T) => readonly T[] | undefined;
  /** Merged over the derived defaults (`id`, `label`, and `parentOf`/`count` for branches). */
  getProps?: (item: T, path: string[]) => Partial<TreeItemDataProps>;
  /** Open state on a path's first read; closed by default. */
  isOpen?: (item: T, path: string[]) => boolean;
};

export interface StaticTreeModel<T extends { id: string }> extends TreeModel<T> {
  /** Id of the synthetic root; `childIds(undefined)` resolves to this node's children. */
  readonly rootId: string;
  /** Writable per-path state, for wiring the tree's `onOpenChange` / selection callbacks. */
  stateAtom: (path: string[]) => Atom.Writable<TreeNodeState>;
  /** Writable child ordering, so a drop can push a new order for one parent. */
  childIdsAtom: (parentId?: string) => Atom.Writable<string[]>;
  /**
   * Re-derives every child ordering from the source tree, for callers that mutate it in place
   * (pragmatic-drag-and-drop reorders the array rather than producing a new tree). Takes the
   * setter rather than a registry so the model stays independent of the React binding.
   */
  refresh: (set: <A>(atom: Atom.Writable<A>, value: A) => void) => void;
}

/**
 * Adapts a plain in-memory tree to the {@link TreeModel} atom-family contract the `Tree` consumes.
 *
 * `Tree`'s only entry point is five atom families, which is the right shape for a store that is
 * already reactive per node (ECHO, a live app graph) but roughly a hundred lines of plumbing for a
 * caller that just holds an array — the cost that kept `ObjectsTree`, `ProcessTree` and the stories
 * on hand-rolled renderers instead. Open/current state is owned here, keyed by path, so the same
 * node appearing at two paths stays independent.
 */
export const createStaticTreeModel = <T extends { id: string }>(
  root: T,
  options: StaticTreeModelOptions<T>,
): StaticTreeModel<T> => {
  const { getChildren, getProps, isOpen } = options;

  const itemMap = new Map<string, T>();
  const childIdsMap = new Map<string, string[]>();

  const index = (item: T): void => {
    itemMap.set(item.id, item);
    const children = getChildren(item) ?? [];
    childIdsMap.set(
      item.id,
      children.map((child) => child.id),
    );
    children.forEach(index);
  };
  index(root);

  const stateAtoms = new Map<string, Atom.Writable<TreeNodeState>>();
  const stateAtom = (path: string[]): Atom.Writable<TreeNodeState> => {
    const key = Path.create(...path);
    let atom = stateAtoms.get(key);
    if (!atom) {
      const item = itemMap.get(path.at(-1) ?? root.id);
      const open = item !== undefined && (isOpen?.(item, path) ?? false);
      atom = Atom.make<TreeNodeState>({ open, current: false }).pipe(Atom.keepAlive);
      stateAtoms.set(key, atom);
    }
    return atom;
  };

  // Writable rather than derived: a derived atom would snapshot the initial ordering and never
  // reflect an in-place reorder pushed through `refresh`.
  const childIdsFamily = Atom.family((id: string) =>
    Atom.make<string[]>(childIdsMap.get(id) ?? []).pipe(Atom.keepAlive),
  );

  const itemFamily = Atom.family((id: string) => Atom.make(() => itemMap.get(id)).pipe(Atom.keepAlive));

  const itemPropsFamily = Atom.family((key: string) =>
    Atom.make<TreeItemDataProps>(() => {
      const path = Path.parts(key);
      const id = path.at(-1) ?? root.id;
      const item = itemMap.get(id);
      if (!item) {
        return { id, label: id };
      }

      const children = getChildren(item) ?? [];
      return {
        id: item.id,
        label: item.id,
        ...(children.length > 0 && {
          parentOf: children.map((child) => child.id),
          count: children.length,
        }),
        ...getProps?.(item, path),
      };
    }).pipe(Atom.keepAlive),
  );

  const childIdsAtom = (parentId?: string) => childIdsFamily(parentId ?? root.id);

  return {
    rootId: root.id,
    childIds: childIdsAtom,
    childIdsAtom,
    stateAtom,
    item: (id: string) => itemFamily(id),
    itemProps: (path: string[]) => itemPropsFamily(Path.create(...path)),
    itemOpen: (path: string[]) => {
      const atom = stateAtom(path);
      return Atom.make((get) => get(atom).open).pipe(Atom.keepAlive);
    },
    itemCurrent: (path: string[]) => {
      const atom = stateAtom(path);
      return Atom.make((get) => get(atom).current).pipe(Atom.keepAlive);
    },
    refresh: (set) => {
      itemMap.clear();
      childIdsMap.clear();
      index(root);
      for (const [id, ids] of childIdsMap) {
        set(childIdsFamily(id), ids);
      }
    },
  };
};
