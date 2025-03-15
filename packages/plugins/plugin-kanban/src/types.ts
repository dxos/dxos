//
// Copyright 2025 DXOS.org
//

import { TitleAnnotationId } from 'effect/SchemaAST';

import { S } from '@dxos/echo-schema';
import { type Space, SpaceSchema } from '@dxos/react-client/echo';
import { KanbanType } from '@dxos/react-ui-kanban';
import { initializeKanban } from '@dxos/react-ui-kanban/testing';
import { FieldSchema } from '@dxos/schema';

import { KANBAN_PLUGIN } from './meta';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

export const InitialSchemaAnnotationId = Symbol.for('@dxos/plugin-kanban/annotation/InitialSchema');
export const InitialPivotColumnAnnotationId = Symbol.for('@dxos/plugin-kanban/annotation/InitialPivotColumn');

export const CreateKanbanSchema = S.Struct({
  name: S.optional(S.String),
  initialSchema: S.optional(
    S.String.annotations({
      [InitialSchemaAnnotationId]: true,
      [TitleAnnotationId]: 'Select card schema (leave empty to start fresh)',
    }),
  ),
  initialPivotColumn: S.optional(
    S.String.annotations({
      [InitialPivotColumnAnnotationId]: true,
      [TitleAnnotationId]: 'Pivot column',
    }),
  ),
});

export type CreateKanbanType = S.Schema.Type<typeof CreateKanbanSchema>;

export namespace KanbanAction {
  const KANBAN_ACTION = `${KANBAN_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${KANBAN_ACTION}/create`, {
    input: S.extend(S.Struct({ space: SpaceSchema }), CreateKanbanSchema),
    output: S.Struct({
      object: KanbanType,
    }),
  }) {}

  export class DeleteCardField extends S.TaggedClass<DeleteCardField>()(`${KANBAN_ACTION}/delete-card-field`, {
    input: S.Struct({
      kanban: KanbanType,
      fieldId: S.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: S.optional(
        S.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: S.Any,
          index: S.Number,
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class DeleteCard extends S.TaggedClass<DeleteCard>()(`${KANBAN_ACTION}/delete-card`, {
    input: S.Struct({
      card: S.Any, // The card object to delete
    }),
    output: S.Void,
  }) {}
}

// TODO(burdon): Undo?
// TODO(burdon): Typescript types (replace proto with annotations?)
// TODO(burdon): Should pure components depend on ECHO? Relationship between ECHO object/array and Observable.
// TODO(burdon): Can the plugin configure the object based on the data? E.g., how are the models constructed?
// TODO(burdon): Create models. Simple first based on actual data.
//  Model is always a projection since the dragging state is tentative.

// TODO(burdon): Extend model for moving items (in and across columns).
export interface KanbanModel {
  root: KanbanType;
}

export type Location = {
  idx?: number;
};

export const isKanban = (object: unknown): object is KanbanType => object != null && object instanceof KanbanType;

export const createKanban = async (props: { space: Space; initialSchema?: string; initialPivotColumn?: string }) => {
  const { kanban } = await initializeKanban(props);
  return kanban;
};
