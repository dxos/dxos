// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { JsonSchema, Obj, Type } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RestoreField> = SpaceOperation.RestoreField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const view = input.view as any;
      const db = Obj.getDatabase(view);
      invariant(db);
      const typename = getTypenameFromQuery(view.query.ast);
      invariant(typename);
      const types = yield* db.graph.registry.listTypes();
      const schema = types.find((t) => Type.getTypename(t) === typename);
      invariant(schema);

      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: JsonSchema.toJsonSchema(schema),
        change: createEchoChangeCallback(view, schema as EchoSchema),
      });

      projection.setFieldProjection({ field: input.field, props: input.props }, input.index);
    }),
  ),
);
export default handler;
