//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, UndoMapping } from '@dxos/app-framework';
import { JsonSchema, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { ProjectionModel, View, getTypenameFromQuery } from '@dxos/schema';

import { meta } from '../../meta';
import { KanbanOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(Common.Capability.UndoMapping, [
      UndoMapping.make({
        operation: KanbanOperation.DeleteCardField,
        inverse: KanbanOperation.RestoreCardField,
        deriveContext: (input, output) => ({
          view: input.view,
          field: output.field,
          props: output.props,
          index: output.index,
        }),
        message: ['card field deleted label', { ns: meta.id }],
      }),
      UndoMapping.make({
        operation: KanbanOperation.DeleteCard,
        inverse: KanbanOperation.RestoreCard,
        deriveContext: (_input, output) => ({
          card: output.card,
        }),
        message: ['card deleted label', { ns: meta.id }],
      }),
    ]),
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: KanbanOperation.Create,
        handler: ({ db, name, typename, initialPivotColumn }) =>
          Effect.gen(function* () {
            const { view } = yield* Effect.promise(() =>
              View.makeFromDatabase({ db, typename, pivotFieldName: initialPivotColumn }),
            );
            const kanban = Kanban.make({ name, view });
            return { object: kanban };
          }),
      }),
      OperationResolver.make({
        operation: KanbanOperation.DeleteCardField,
        handler: ({ view, fieldId }) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(view);
            invariant(db, 'Database not found');
            const schema = yield* Effect.promise(() =>
              db.schemaRegistry
                .query({
                  typename: getTypenameFromQuery(view.query.ast)!,
                  location: ['database', 'runtime'],
                })
                .first(),
            );
            const projection = new ProjectionModel(JsonSchema.toJsonSchema(schema), view.projection);
            const { deleted, index } = projection.deleteFieldProjection(fieldId);

            // Return data needed for undo.
            return {
              field: deleted.field,
              props: deleted.props,
              index,
            };
          }),
      }),
      OperationResolver.make({
        operation: KanbanOperation.DeleteCard,
        handler: ({ card }) =>
          Effect.sync(() => {
            const db = Obj.getDatabase(card);
            invariant(db);
            db.remove(card);

            // Return data needed for undo.
            return { card };
          }),
      }),

      //
      // RestoreCardField (inverse of DeleteCardField)
      //
      OperationResolver.make({
        operation: KanbanOperation.RestoreCardField,
        handler: ({ view, field, props, index }) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(view);
            invariant(db, 'Database not found');
            const schema = yield* Effect.promise(() =>
              db.schemaRegistry
                .query({
                  typename: getTypenameFromQuery(view.query.ast)!,
                  location: ['database', 'runtime'],
                })
                .first(),
            );
            const projection = new ProjectionModel(JsonSchema.toJsonSchema(schema), view.projection);
            projection.setFieldProjection({ field, props }, index);
          }),
      }),

      //
      // RestoreCard (inverse of DeleteCard)
      //
      OperationResolver.make({
        operation: KanbanOperation.RestoreCard,
        handler: ({ card }) =>
          Effect.sync(() => {
            const db = Obj.getDatabase(card);
            invariant(db);
            db.add(card);
          }),
      }),
    ]),
  ]),
);

