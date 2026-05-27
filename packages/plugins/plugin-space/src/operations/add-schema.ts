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
      const [schema] = yield* Effect.promise(() => db.schemaRegistry.register([input.schema as Type.Type]));
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
      const onTypeAdded = yield* Capability.getAll(SpaceCapabilities.OnTypeAdded);
      yield* Effect.all(
        onTypeAdded.map((callback) => callback({ db, type: schema, show: input.show })),
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

      return { id: schema.id, object: schema };
    }),
  ),
);
export default handler;
