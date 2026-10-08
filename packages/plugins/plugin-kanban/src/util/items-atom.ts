//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj, Ref } from '@dxos/echo';

import { type Kanban } from '#types';

/**
 * The loaded targets of an items-variant kanban's `spec.items`, in ref order.
 * Re-runs when the ref list or any card changes, not on arrangement writes.
 */
export const makeItemsAtom = (kanban: Kanban.KanbanItems): Atom.Atom<Obj.Unknown[]> => {
  // `spec` is a record, so its property atom re-emits on every kanban write (each drag's arrangement update).
  // Copied, because the record's snapshot is shallow and `items` is still the live array.
  const refsAtom = Atom.make((get) => [...get(Obj.atomProperty(kanban, 'spec')).items]).pipe(
    Atom.withEquality<Ref.Ref<Obj.Unknown>[]>(Ref.equals),
  );

  return Atom.make((get) => {
    const items: Obj.Unknown[] = [];
    for (const ref of get(refsAtom)) {
      // The snapshot re-runs this on a card edit, which re-buckets it by its pivot field; the live object
      // alone keeps one identity across edits.
      get(Obj.atom(ref));
      // Soft-deleted cards (e.g. Trello-closed) resolve to undefined; their refs stay so arrangement holds.
      const target = get(Obj.atomReactive(ref));
      if (target) {
        items.push(target);
      }
    }
    return items;
  });
};
