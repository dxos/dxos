// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { SpaceState } from '@dxos/client/echo';
import { Migrations } from '@dxos/migrations';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { SpaceCapabilities } from '../types';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Migrate> = SpaceOperation.Migrate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { space, version: targetVersion } = input;

      if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
        yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
          ...current,
          sdkMigrationRunning: { ...current.sdkMigrationRunning, [space.id]: true },
        }));
        yield* Effect.promise(() => space.internal.migrate());
        yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
          ...current,
          sdkMigrationRunning: { ...current.sdkMigrationRunning, [space.id]: false },
        }));
      }
      const result = yield* Effect.promise(() => Migrations.migrate(space, targetVersion));

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.migrate',
        properties: {
          spaceId: space.id,
          targetVersion,
          version: Migrations.versionProperty ? space.properties[Migrations.versionProperty] : undefined,
        },
      });

      return result;
    }),
  ),
);
export default handler;
