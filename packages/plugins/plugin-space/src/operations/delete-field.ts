// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Filter, JsonSchema, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ProjectionModel, createEchoChangeCallback, getTypeURIFromQuery } from '@dxos/schema';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.DeleteField> = SpaceOperation.DeleteField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const view = input.view as any;
      const db = Obj.getDatabase(view);
      invariant(db);
      const typeUri = getTypeURIFromQuery(view.query.ast);
      invariant(typeUri);
      const types = yield* Effect.promise(() => db.query(Filter.type(Type.Type)).run());
      const schema = types.find((t) => Type.getURI(t) === typeUri);
      invariant(schema);

      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: JsonSchema.toJsonSchema(schema),
        change: createEchoChangeCallback(view, schema),
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
