// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { JsonSchema, Obj } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';

import { DeleteCardField } from './definitions';

export default DeleteCardField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, fieldId }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
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

      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: JsonSchema.toJsonSchema(schema),
        change: createEchoChangeCallback(view, schema as EchoSchema),
      });

      const result = projection.deleteFieldProjection(fieldId);

      return {
        field: result.deleted.field,
        props: result.deleted.props,
        index: result.index,
      };
    }),
  ),
);
