// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { Collection, Obj, Ref } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { iconValues } from '@dxos/react-ui-pickers/icons';
import { hues } from '@dxos/ui-theme';

import { SpaceEvents, SpaceCapabilities } from '../types';

import { SpaceOperation } from './definitions';
import { SpaceOperationConfig } from './helpers';

const handler: Operation.WithHandler<typeof SpaceOperation.Create> = SpaceOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, hue: hue_, icon: icon_, edgeReplication }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const hue = hue_ ?? hues[Math.floor(Math.random() * hues.length)];
      const icon = icon_ ?? iconValues[Math.floor(Math.random() * iconValues.length)];
      const space = yield* Effect.promise(() => client.spaces.create({ name, hue, icon }));
      if (edgeReplication) {
        yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
      }
      yield* Effect.promise(() => space.waitUntilReady());

      const collection = Obj.make(Collection.Collection, { objects: [] });
      Obj.change(space.properties, (obj) => {
        obj[Collection.Collection.typename] = Ref.make(collection);
        if (Migrations.versionProperty) {
          obj[Migrations.versionProperty] = Migrations.targetVersion;
        }
      });

      yield* Plugin.activate(SpaceEvents.SpaceCreated);
      const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
      yield* Effect.all(
        onCreateSpaceCallbacks.map((onCreateSpace) =>
          onCreateSpace({ space, isDefault: false, rootCollection: collection }),
        ),
      );

      const { observability } = yield* Capability.get(SpaceOperationConfig);
      if (observability) {
        yield* Operation.schedule(ObservabilityOperation.SendEvent, {
          name: 'space.create',
          properties: { spaceId: space.id },
        });
      }

      return { id: space.id, subject: [space.id], space };
    }),
  ),
);
export default handler;
