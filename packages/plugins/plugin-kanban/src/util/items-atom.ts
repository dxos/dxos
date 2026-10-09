//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj, Ref } from '@dxos/echo';
import { shallowEqual } from '@dxos/util';

import { type Kanban } from '#types';

/**
 * The field id cards are grouped by: the view's `projection.pivotFieldId`, or an items kanban's `spec.pivotField`.
 */
export const makePivotFieldIdAtom = (kanban: Kanban.Kanban): Atom.Atom<string | undefined> =>
  Atom.make((get) => {
    const spec = get(Obj.atomProperty(kanban, 'spec'));
    if (spec.kind === 'items') {
      return spec.pivotField;
    }
    return get(Obj.atom(spec.view))?.projection?.pivotFieldId as string | undefined;
  });

export const makeColumnIdsAtom = (kanban: Kanban.Kanban): Atom.Atom<string[]> =>
  Atom.make((get) => Object.keys(get(Obj.atomProperty(kanban, 'arrangement'))?.columns ?? {})).pipe(
    Atom.withEquality<string[]>(shallowEqual),
  );

/**
 * The loaded targets of an items kanban's `spec.items`, in ref order. Follows membership only: a card's
 * column comes from its own pivot property (see `useKanbanBoardModel`).
 */
export const makeItemsAtom = (kanban: Kanban.KanbanItems): Atom.Atom<Obj.Unknown[]> => {
  const refsAtom = Atom.make((get) => [...get(Obj.atomProperty(kanban, 'spec')).items]).pipe(
    Atom.withEquality<Ref.Ref<Obj.Unknown>[]>(Ref.equals),
  );
  return Atom.make((get) => get(Obj.atomReactive(get(refsAtom))));
};
