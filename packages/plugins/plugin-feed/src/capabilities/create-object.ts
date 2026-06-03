//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Blueprint, Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { MagazineBlueprint } from '#blueprints';
import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Subscription.Subscription),
        inputSchema: Subscription.CreateSubscriptionSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Subscription.makeSubscription(props);
            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
            // Auto-sync after creation if URL is provided.
            if (object.url) {
              yield* Operation.schedule(
                FeedOperation.SyncFeed,
                { feed: Ref.make(object) },
                { spaceId: Obj.getDatabase(object)?.spaceId },
              );
            }
            return result;
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Magazine.Magazine),
        inputSchema: Magazine.CreateMagazineSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const { instructions, ...magazineProps } = props;
            const { magazine, routine } = Magazine.make({
              ...magazineProps,
              routine: instructions ? { instructions } : undefined,
            });

            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object: magazine,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });

            // Wire the blueprint into the routine now that the magazine is in the db.
            // Best-effort: if the db is unavailable the routine starts with no blueprint.
            yield* Effect.gen(function* () {
              const db = Obj.getDatabase(magazine);
              if (!db) {
                return;
              }
              const existing = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
              const blueprint =
                existing.find((b) => Obj.getMeta(b).key === Magazine.BLUEPRINT_KEY) ??
                db.add(MagazineBlueprint.make());
              Obj.update(routine, (routine) => {
                routine.blueprints = [Ref.make(blueprint)];
              });
            }).pipe(Effect.option);

            // Add the companion Routine (hidden, cascade-deleted with magazine). Best-effort.
            yield* Operation.invoke(SpaceOperation.AddObject, {
              object: routine,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            }).pipe(Effect.option);

            return result;
          }),
      }),
    ];
  }),
);
