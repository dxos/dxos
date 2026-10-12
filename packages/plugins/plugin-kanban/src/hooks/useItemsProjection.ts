//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type { ProjectionModel } from '@dxos/schema';

import { Kanban } from '#types';

import { makeColumnIdsAtom, makePivotFieldIdAtom } from '../util/index.ts';

/**
 * Minimal `ProjectionModel` for `spec.kind === 'items'` (no View). Supplies `pivotField`
 * and column options from `arrangement.columns` keys—written by sync so columns exist
 * before refs hydrate. Stubs `getFieldProjections` / `getHiddenProperties` for shared
 * board/card UI; hides the pivot on the card body (column shows it); Expando cards render title only.
 */
export const useItemsProjection = (kanban: Kanban.KanbanItems): ProjectionModel => {
  const pivotField = useAtomValue(useMemo(() => makePivotFieldIdAtom(kanban), [kanban]));
  const optionIds = useAtomValue(useMemo(() => makeColumnIdsAtom(kanban), [kanban]));

  return useMemo(() => {
    const options = optionIds.map((id) => ({ id, title: id, color: 'neutral' as const }));

    const fieldProjection: any = {
      field: { id: pivotField, path: pivotField },
      props: { property: pivotField, options },
    };

    const fields = Atom.make(() => [fieldProjection.field]);

    const stub: Pick<ProjectionModel, 'tryGetFieldProjection' | 'getFieldProjections' | 'getHiddenProperties'> & {
      fields: typeof fields;
    } = {
      fields,
      tryGetFieldProjection: (id: string) => (id === pivotField ? fieldProjection : undefined),
      getFieldProjections: () => [],
      getHiddenProperties: () => (pivotField ? [pivotField] : []),
    };

    // TODO(wittjosiah): Refactor ProjectionModel to be an interface that we can fulfill.
    return stub as unknown as ProjectionModel;
  }, [optionIds, pivotField]);
};
