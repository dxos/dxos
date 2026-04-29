//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import type { ProjectionModel } from '@dxos/schema';

import { type Kanban } from '#types';

/**
 * Stub `ProjectionModel`-shaped object for items-variant kanbans.
 *
 * Items-variant kanbans don't have a backing `View`, so the real `ProjectionModel`
 * (which depends on a View) doesn't apply. `useKanbanBoardModel` only touches a
 * narrow surface of `ProjectionModel` (`fields`, `tryGetFieldProjection(id)`),
 * so we expose just that with `pivotField` as the synthetic field id and the
 * distinct values seen on items as the select options.
 *
 * Trade-off: options aren't reactive across item-property changes — they're
 * computed once per `kanban.spec.items` change. Acceptable for v1; tighter
 * reactivity is a later refinement.
 */
export const useItemsProjection = (kanban: Kanban.KanbanItems): ProjectionModel => {
  return useMemo(() => {
    const pivotField = kanban.spec.pivotField;

    // Distinct pivot values seen on the current open items.
    // Closed/tombstoned items contribute neither options nor cards (see ItemsKanbanContainer).
    const optionIds = new Set<string>();
    for (const ref of kanban.spec.items) {
      const target = ref.target as Record<string, unknown> | undefined;
      if (!target || target.closed === true) continue;
      const value = target[pivotField];
      if (typeof value === 'string' && value.length > 0) {
        optionIds.add(value);
      }
    }
    const options = [...optionIds].map((id) => ({ id, title: id, color: 'neutral' as const }));

    const fieldProjection: any = {
      field: { id: pivotField, path: pivotField },
      props: { property: pivotField, options },
    };

    const fields = Atom.make(() => [fieldProjection.field]);

    const stub: Pick<ProjectionModel, 'tryGetFieldProjection'> & { fields: typeof fields } = {
      fields,
      tryGetFieldProjection: (id: string) => (id === pivotField ? fieldProjection : undefined),
    };

    return stub as unknown as ProjectionModel;
  }, [kanban.spec]);
};
