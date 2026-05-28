// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { SpaceEvents, SpaceCapabilities } from '../types';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.AddType> = SpaceOperation.AddType.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const db = input.db;
      const type = db.add(input.type);
      Type.update(type, (draft) => {
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

      yield* Plugin.activate(SpaceEvents.TypeAdded);
      const onTypeAdded = yield* Capability.getAll(SpaceCapabilities.OnTypeAdded);
      yield* Effect.all(
        onTypeAdded.map((callback) => callback({ db, type, show: input.show })),
        { concurrency: 'unbounded' },
      );

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.type.add',
        properties: {
          spaceId: db.spaceId,
          objectId: type.id,
          typename: Type.getTypename(type),
        },
      });

      return { id: type.id!, object: type };
    }),
  ),
);
export default handler;
