// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { SpaceState } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Migrations } from '@dxos/migrations';

import { SpaceCapabilities, SpaceOperation } from '#types';

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

      return result;
    }),
  ),
);
export default handler;
