//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities } from '@dxos/plugin-space/types';

import { CreateGamePanel } from '#components';

import { GameCapabilities, make as makeGame, Game } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Game.typename,
      customPanel: CreateGamePanel,
      createObject: (
        { variantId, input }: { variantId: string; input?: Record<string, any> },
        options: CreateOptions,
      ) =>
        Effect.gen(function* () {
          const variants = yield* Capability.getAll(GameCapabilities.Variant);
          const variant = variants.find((v) => v.id === variantId);
          invariant(variant, `Unknown game variant: ${variantId}`);

          // Build variant state object via the variant's factory.
          const stateObject = yield* variant
            .createVariant(input ?? {})
            .pipe(Effect.provideService(Database.Service, Database.makeService(options.db)));

          // Add variant state to the database (hidden — it's referenced by Game).
          yield* Operation.invoke(SpaceOperation.AddObject, {
            object: stateObject,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });

          const game = makeGame({
            name: typeof input?.name === 'string' ? input.name : undefined,
            variant: stateObject,
          });

          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object: game,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
