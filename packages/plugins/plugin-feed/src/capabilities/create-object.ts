//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
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
            const { instructions, ...magazineProps } = props;
            // The topic instructions live on the magazine; the base methodology is the registry
            // skill, attached to the in-memory routine at curation time (no persisted routine).
            const magazine = Magazine.make({ ...magazineProps, instructions });

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
