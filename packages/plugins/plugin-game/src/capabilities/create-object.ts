//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateGamePanel } from '#components';

import { Game, GameCapabilities, make as makeGame } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.provide(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Game),
        customPanel: CreateGamePanel,
        createObject: (
          { variantId, input }: { variantId: string; input?: Record<string, any> },
          options: CreateOptions,
        ) =>
          Effect.gen(function* () {
            const variants = yield* Capability.getAll(GameCapabilities.VariantProvider);
            const variant = variants.find((v) => v.id === variantId);
            invariant(variant, `Unknown game variant: ${variantId}`);

            // Build variant state object via the variant's factory.
            const stateObject = yield* variant
              .createVariant(input ?? {})
              .pipe(Effect.provideService(Database.Service, Database.makeService(options.db)));

            // Add variant state to the database. Stays hidden — it's referenced by Game and
            // shouldn't appear as a top-level item in the user's space.
            yield* Operation.invoke(SpaceOperation.AddObject, {
              object: stateObject,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });

            const game = makeGame({
              name: typeof input?.name === 'string' ? input.name : undefined,
              variant: stateObject,
            });

            // Add the user-facing Game wrapper. Not hidden — this is the object the user sees
            // and navigates to. If this second write fails, roll back the variant state so we
            // don't leak an orphaned object into the space.
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object: game,
              target: options.target,
              targetNodeId: options.targetNodeId,
            }).pipe(
              Effect.tapError(() =>
                Operation.invoke(SpaceOperation.RemoveObjects, { objects: [stateObject] }).pipe(Effect.ignore),
              ),
            );
          }),
      }),
    ];
  }),
);
