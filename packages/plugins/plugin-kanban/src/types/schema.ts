//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, FieldSchema, TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

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

export const CreateKanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['used-static', 'dynamic'],
      title: 'Select card record type (leave empty to start fresh)',
    }),
  ),
  initialPivotColumn: Schema.optional(
    Schema.String.annotations({
      [PivotColumnAnnotationId]: true,
      title: 'Pivot column',
    }),
  ),
});

export namespace KanbanAction {
  const KANBAN_ACTION = `${meta.id}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${KANBAN_ACTION}/create`, {
    input: Schema.extend(Schema.Struct({ space: SpaceSchema }), CreateKanbanSchema),
    output: Schema.Struct({
      object: DataType.View.View,
    }),
  }) {}

  export class DeleteCardField extends Schema.TaggedClass<DeleteCardField>()(`${KANBAN_ACTION}/delete-card-field`, {
    input: Schema.Struct({
      view: DataType.View.View,
      fieldId: Schema.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: Schema.optional(
        Schema.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: Schema.Any,
          index: Schema.Number,
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class DeleteCard extends Schema.TaggedClass<DeleteCard>()(`${KANBAN_ACTION}/delete-card`, {
    input: Schema.Struct({
      card: Schema.Any, // The card object to delete
    }),
    output: Schema.Void,
  }) {}
}
