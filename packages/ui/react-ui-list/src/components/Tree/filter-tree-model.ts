//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Path } from '../../util/index.ts';
import { type TreeItemDataProps, type TreeModel } from './tree-model.ts';

/**
 * A view of `model` holding only the items `predicate` matches and their ancestors, with every ancestor of a match
 * open so the matches show; open and current state otherwise pass through, so clearing the filter (dropping the view)
 * restores the tree as it was. Build a new view when the predicate changes.
 */
export const filterTreeModel = <T extends { id: string }>(
  model: TreeModel<T>,
  predicate: (item: T) => boolean,
): TreeModel<T> => {
  /** Whether `id` or anything under it matches; `seen` stops a cycle in the model, which the walk also skips. */
  const search = (get: Atom.AtomContext, id: string, seen: ReadonlySet<string>): boolean => {
    const item = get(model.item(id));
    if (item && predicate(item)) {
      return true;
    }
    const next = new Set(seen).add(id);
    return get(model.childIds(id)).some((child) => !next.has(child) && search(get, child, next));
  };

  const matches = Atom.family((id: string) => Atom.make((get) => search(get, id, new Set())));

  /** Whether something strictly under `id` matches, which is what opens it. */
  const below = Atom.family((id: string) =>
    Atom.make((get) => get(model.childIds(id)).some((child) => child !== id && get(matches(child)))),
  );

  const childIds = Atom.family((parentId: string | undefined) =>
    Atom.make((get) => get(model.childIds(parentId)).filter((id) => get(matches(id)))),
  );

  const itemOpen = Atom.family((key: string) =>
    Atom.make((get) => {
      const path = Path.parts(key);
      const id = path.at(-1);
      return (id !== undefined && get(below(id))) || get(model.itemOpen(path));
    }),
  );

  // A branch lists only its kept children, so its count and its caret agree with what opening it shows.
  const itemProps = Atom.family((key: string) =>
    Atom.make((get): TreeItemDataProps => {
      const path = Path.parts(key);
      const props = get(model.itemProps(path));
      const id = path.at(-1);
      if (props.parentOf === undefined || id === undefined) {
        return props;
      }
      const kept = get(childIds(id));
      return { ...props, parentOf: kept, ...(props.count !== undefined && { count: kept.length }) };
    }),
  );

  return {
    item: model.item,
    itemCurrent: model.itemCurrent,
    childIds: (parentId) => childIds(parentId),
    itemOpen: (path) => itemOpen(Path.create(...path)),
    itemProps: (path) => itemProps(Path.create(...path)),
  };
};
