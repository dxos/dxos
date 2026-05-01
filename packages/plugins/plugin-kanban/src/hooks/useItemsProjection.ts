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
 * (which depends on a View) doesn't apply. We synthesize a minimal one exposing
 * `pivotField` so `useKanbanBoardModel` can pivot, and stubbed accessors so
 * downstream consumers (the card-rendering `FormFieldSet`) don't crash on
 * methods like `getFieldProjections()` / `getHiddenProperties()`.
 *
 * Column options are derived from `kanban.arrangement.columns` keys, NOT from
 * loaded items. The integration sync writes `arrangement.columns` from the
 * service's own ordering primitive (e.g. Trello's `pos`), so the full column
 * list is available before any item ref has hydrated. This avoids subscribing
 * to every item just to know which columns exist — items remain on lazy load.
 *
 * Card body rendering: we hide `pivotField` (it's already shown as the column
 * the card lives in) and report no other field projections, which makes the
 * `FormFieldSet` fall through to schema-only ordering — Expando schemas have
 * no fixed properties, so the body renders empty and the card shows just the
 * title (`Obj.getLabel(data)`).
 */
export const useItemsProjection = (kanban: Kanban.KanbanItems): ProjectionModel => {
  return useMemo(() => {
    const pivotField = kanban.spec.pivotField;

    // Column list comes from the kanban's arrangement, written by sync. Reading
    // `kanban.arrangement.columns` is reactive through ECHO — when sync rewrites
    // it, this hook re-renders and the column structure updates.
    const optionIds = Object.keys(kanban.arrangement?.columns ?? {});
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
      // Card-body renderer asks for the projection's field list. We don't surface
      // the pivot here (the column already conveys it) and Expandos have no other
      // fixed fields to project, so report none.
      getFieldProjections: () => [],
      // Hide the pivot from the card body to avoid rendering it twice.
      getHiddenProperties: () => [pivotField],
    };

    return stub as unknown as ProjectionModel;
  }, [kanban.arrangement?.columns, kanban.spec.pivotField]);
};
