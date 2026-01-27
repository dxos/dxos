//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, UndoMapping } from '@dxos/app-framework';
import { JsonSchema, Obj } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { OperationResolver } from '@dxos/operation';
import { ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';

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
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: KanbanOperation.DeleteCardField,
        handler: Effect.fnUntraced(function* ({ view, fieldId }) {
          const registry = yield* Capability.get(Common.Capability.AtomRegistry);
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

          // Create projection with change callbacks that wrap in Obj.change().
          // Schema from registry is an EchoSchema at runtime.
          const projection = new ProjectionModel({
            registry,
            view,
            baseSchema: JsonSchema.toJsonSchema(schema),
            change: createEchoChangeCallback(view, schema as EchoSchema),
          });

          const result = projection.deleteFieldProjection(fieldId);

          // Return data needed for undo.
          return {
            field: result.deleted.field,
            props: result.deleted.props,
            index: result.index,
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
        handler: Effect.fnUntraced(function* ({ view, field, props, index }) {
          const registry = yield* Capability.get(Common.Capability.AtomRegistry);
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

          // Create projection with change callbacks that wrap in Obj.change().
          // Schema from registry is an EchoSchema at runtime.
          const projection = new ProjectionModel({
            registry,
            view,
            baseSchema: JsonSchema.toJsonSchema(schema),
            change: createEchoChangeCallback(view, schema as EchoSchema),
          });

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
