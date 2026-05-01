//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

// TODO(wittjosiah): Factor out?
export const PivotColumnAnnotationId = Symbol.for('@dxos/plugin-kanban/annotation/PivotColumn');

/**
 * Settings common to every Kanban (view or items). Rendered as form fields
 * by `KanbanSettings`.
 */
export const KanbanSettingsSchema = Schema.Struct({
  hideUncategorized: Schema.Boolean.annotations({
    title: 'Hide uncategorized column',
    description: 'When enabled, items without a pivot value won’t be shown as a column.',
  }).pipe(Schema.optional),
});

/**
 * Settings for view-variant Kanbans only. Spreads {@link KanbanSettingsSchema}'s
 * fields and adds a column-field picker that binds the View’s pivot field.
 * Items-variant kanbans use a hardcoded `spec.pivotField` and don’t expose
 * this control.
 */
export const KanbanViewSettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field',
  }),
  ...KanbanSettingsSchema.fields,
});

export const CreateKanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select card type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
    Schema.optional,
  ),
  initialPivotColumn: Schema.optional(
    Schema.String.annotations({
      [PivotColumnAnnotationId]: true,
      title: 'Pivot column',
    }),
  ),
});
