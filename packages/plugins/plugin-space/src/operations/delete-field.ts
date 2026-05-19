// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { JsonSchema, Obj, Type } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.DeleteField> = SpaceOperation.DeleteField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const view = input.view as any;
      const db = Obj.getDatabase(view);
      invariant(db);
      const typename = getTypenameFromQuery(view.query.ast);
      invariant(typename);
      const schema = yield* Effect.promise(() =>
        Promise.resolve(db.graph.registry.types.find((t) => Type.getTypename(t) === typename)),
      );
      invariant(schema);

      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: JsonSchema.toJsonSchema(schema),
        change: createEchoChangeCallback(view, schema as EchoSchema),
      });

      const result = projection.deleteFieldProjection(input.fieldId);

      return {
        field: result.deleted.field,
        props: result.deleted.props,
        index: result.index,
      };
    }),
  ),
);
export default handler;
