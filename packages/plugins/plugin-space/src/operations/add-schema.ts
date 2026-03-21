// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { SpaceEvents, SpaceCapabilities } from '../types';

import { SpaceOperation } from './definitions';

export default SpaceOperation.AddSchema.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const db = input.db;
      const schemas = yield* Effect.promise(() => db.schemaRegistry.register([input.schema]));
      const schema = schemas[0];
      Obj.change(schema.persistentSchema, (s) => {
        if (input.name) {
          s.name = input.name;
        }
        if (input.typename) {
          s.typename = input.typename;
        }
        if (input.version) {
          s.version = input.version;
        }
      });

      yield* Plugin.activate(SpaceEvents.SchemaAdded);
      const onSchemaAdded = yield* Capability.getAll(SpaceCapabilities.OnSchemaAdded);
      yield* Effect.all(
        onSchemaAdded.map((callback) => callback({ db, schema, show: input.show })),
        { concurrency: 'unbounded' },
      );

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.schema.add',
        properties: {
          spaceId: db.spaceId,
          objectId: schema.id,
          typename: schema.typename,
        },
      });

      return { id: schema.id, object: schema.persistentSchema, schema };
    }),
  ),
);
