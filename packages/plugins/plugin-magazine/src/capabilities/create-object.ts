//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation, Trigger } from '@dxos/compute';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

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
            // `make` creates the curation Routine and Instructions with the magazine, seeding the
            // editorial brief from the dialog's `instructions` field. The Instructions has no Ref
            // from the magazine or routine (found via parent query at run time), so it must be added
            // to the database explicitly; the magazine/routine/postState cascade via strong Refs.
            const { magazine, routine, instructions } = Magazine.make(props);

            // Attach an hourly trigger so the magazine curates on a schedule. The trigger
            // is created here (not in make()) to avoid a circular import between Magazine.ts
            // and FeedOperation.ts. It cascades via routine.triggers when the magazine is added.
            const curateTrigger = Trigger.make({
              spec: Trigger.specTimer('0 * * * *'),
              enabled: true,
              function: Ref.make(Operation.serialize(FeedOperation.CurateMagazine)),
              input: { magazine: Ref.make(magazine) },
            });
            Obj.setParent(curateTrigger, routine);
            Obj.update(routine, (routine) => {
              routine.triggers = [Ref.make(curateTrigger)];
            });

            const db = Database.isDatabase(options.target)
              ? options.target
              : Obj.getDatabase(options.target as Obj.Unknown);
            db?.add(instructions);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object: magazine,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
