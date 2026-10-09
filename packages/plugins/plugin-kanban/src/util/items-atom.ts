//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj, Ref } from '@dxos/echo';
import { shallowEqual } from '@dxos/util';

import { type Kanban } from '#types';

export const makePivotFieldAtom = (kanban: Kanban.KanbanItems): Atom.Atom<string> =>
  Atom.make((get) => get(Obj.atom(kanban)).spec.pivotField);

export const makeColumnIdsAtom = (kanban: Kanban.Kanban): Atom.Atom<string[]> =>
  Atom.make((get) => Object.keys(get(Obj.atom(kanban)).arrangement?.columns ?? {})).pipe(
    Atom.withEquality<string[]>(shallowEqual),
  );

const makeItemRefsAtom = (kanban: Kanban.KanbanItems): Atom.Atom<readonly Ref.Ref<Obj.Unknown>[]> =>
  Atom.make((get) => get(Obj.atom(kanban)).spec.items).pipe(
    Atom.withEquality<readonly Ref.Ref<Obj.Unknown>[]>(Ref.equals),
  );

export const makeItemsAtom = (kanban: Kanban.KanbanItems): Atom.Atom<Obj.Unknown[]> => {
  const refsAtom = makeItemRefsAtom(kanban);
  return Atom.make((get) =>
    get(refsAtom).flatMap((ref) => {
      const snapshot = get(Obj.atom(ref));
      const target = snapshot && get(Obj.atomReactive(ref));
      return target ? [target] : [];
    }),
  );
};
