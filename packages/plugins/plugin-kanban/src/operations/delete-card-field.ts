// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';

import { KanbanOperation } from '../types';

const handler: Operation.WithHandler<typeof KanbanOperation.DeleteCardField> = KanbanOperation.DeleteCardField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, fieldId }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const db = Obj.getDatabase(view);
      invariant(db, 'Database not found');
      const types = yield* Effect.sync(() => db.graph.registry.list().filter(Type.isType));
      const schema = types.find((t) => Type.getTypename(t) === getTypenameFromQuery(view.query.ast));
      invariant(schema, 'Schema not found');

      invariant(Type.isType(schema), 'expected stored Type.Type for card schema');
      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: schema.jsonSchema,
        change: createEchoChangeCallback(view, schema),
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

export default handler;
