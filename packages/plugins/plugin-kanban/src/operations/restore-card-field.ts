// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ProjectionModel, createEchoChangeCallback, getTypeURIFromQuery } from '@dxos/schema';

import { KanbanOperation } from '../types';

const handler: Operation.WithHandler<typeof KanbanOperation.RestoreCardField> = KanbanOperation.RestoreCardField.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, field, props, index }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const db = Obj.getDatabase(view);
      invariant(db, 'Database not found');
      const types = db.graph.registry.list().filter(Type.isType);
      const type = types.find((t) => Type.getURI(t) === getTypeURIFromQuery(view.query.ast));
      invariant(type, 'Schema not found');

      invariant(Type.isType(type), 'expected stored Type.Type for card schema');
      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: type.jsonSchema,
        change: createEchoChangeCallback(view, type),
      });

      projection.setFieldProjection({ field, props }, index);
    }),
  ),
);

export default handler;
