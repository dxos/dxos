//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { FieldSchema, View } from '@dxos/schema';

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

export const SettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field',
  }),
});

export const CreateKanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select card type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
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

export namespace KanbanAction {
  const KANBAN_ACTION = `${meta.id}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${KANBAN_ACTION}/create`, {
    input: Schema.extend(Schema.Struct({ db: Database.Database }), CreateKanbanSchema),
    output: Schema.Struct({
      object: Kanban.Kanban,
    }),
  }) {}

  export class DeleteCardField extends Schema.TaggedClass<DeleteCardField>()(`${KANBAN_ACTION}/delete-card-field`, {
    input: Schema.Struct({
      view: View.View,
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

const KANBAN_OPERATION = `${meta.id}/operation`;

export namespace KanbanOperation {
  export const Create = Operation.make({
    meta: { key: `${KANBAN_OPERATION}/create`, name: 'Create Kanban' },
    schema: {
      input: Schema.extend(Schema.Struct({ db: Database.Database }), CreateKanbanSchema),
      output: Schema.Struct({
        object: Kanban.Kanban,
      }),
    },
  });

  export const DeleteCardFieldOutput = Schema.Struct({
    field: FieldSchema.annotations({ description: 'The deleted field schema.' }),
    props: Schema.Any.annotations({ description: 'The deleted field properties.' }),
    index: Schema.Number.annotations({ description: 'The index the field was at.' }),
  });

  export type DeleteCardFieldOutput = Schema.Schema.Type<typeof DeleteCardFieldOutput>;

  export const DeleteCardField = Operation.make({
    meta: { key: `${KANBAN_OPERATION}/delete-card-field`, name: 'Delete Card Field' },
    schema: {
      input: Schema.Struct({
        view: View.View,
        fieldId: Schema.String,
      }),
      output: DeleteCardFieldOutput,
    },
  });

  export const DeleteCardOutput = Schema.Struct({
    card: Schema.Any.annotations({ description: 'The deleted card.' }),
  });

  export type DeleteCardOutput = Schema.Schema.Type<typeof DeleteCardOutput>;

  export const DeleteCard = Operation.make({
    meta: { key: `${KANBAN_OPERATION}/delete-card`, name: 'Delete Card' },
    schema: {
      input: Schema.Struct({
        card: Schema.Any,
      }),
      output: DeleteCardOutput,
    },
  });

  /**
   * Restore a deleted card field (inverse of DeleteCardField).
   */
  export const RestoreCardField = Operation.make({
    meta: { key: `${KANBAN_OPERATION}/restore-card-field`, name: 'Restore Card Field' },
    schema: {
      input: Schema.Struct({
        view: View.View.annotations({ description: 'The view to restore the field to.' }),
        field: FieldSchema.annotations({ description: 'The field schema to restore.' }),
        props: Schema.Any.annotations({ description: 'The field properties to restore.' }),
        index: Schema.Number.annotations({ description: 'The index to restore the field at.' }),
      }),
      output: Schema.Void,
    },
  });

  /**
   * Restore a deleted card (inverse of DeleteCard).
   */
  export const RestoreCard = Operation.make({
    meta: { key: `${KANBAN_OPERATION}/restore-card`, name: 'Restore Card' },
    schema: {
      input: Schema.Struct({
        card: Schema.Any.annotations({ description: 'The card to restore.' }),
      }),
      output: Schema.Void,
    },
  });
}
