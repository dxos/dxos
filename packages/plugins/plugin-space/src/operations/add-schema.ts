// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { SpaceEvents, SpaceCapabilities } from '../types';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.AddSchema> = SpaceOperation.AddSchema.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const db = input.db;
      const schemas = yield* Effect.promise(() => db.registry.register([input.schema]));
      const schema = schemas[0];
      Type.update(schema, (draft) => {
        if (input.name) {
          draft.name = input.name;
        }
        const meta = Type.getMeta(draft);
        if (input.typename) {
          meta.key = input.typename;
        }
        if (input.version) {
          meta.version = input.version;
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
          typename: Type.getTypename(schema),
        },
      });

      return { id: schema.id!, object: schema as any };
    }),
  ),
);
export default handler;
