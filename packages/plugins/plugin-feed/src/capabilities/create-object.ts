//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { Operation, Routine } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

/** Starter feed seeded into every newly created Magazine. */
const DEFAULT_MAGAZINE_FEED = {
  name: 'EFF Updates',
  url: 'https://www.eff.org/rss/updates.xml',
  type: 'rss',
} as Subscription.Subscription;

/** Example curation instructions seeded into every new Magazine's Routine. */
const DEFAULT_MAGAZINE_INSTRUCTIONS = 'Prefer stories relating to sovereign AI.';

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
            // Seed every new Magazine with one starter Feed so the article view has
            // something to curate immediately rather than booting into an empty state.
            // Best-effort: a seeding failure (AddObject reject, SyncFeed schedule
            // error) must not abort Magazine creation, and partial success (feed
            // added but schedule failed) would otherwise leave an orphaned hidden
            // feed referenced by no magazine. Wrapping the whole block in
            // `Effect.option` collapses both into a clean None on failure.
            const seededFeed = yield* Effect.gen(function* () {
              const defaultFeed = Subscription.makeSubscription({ ...DEFAULT_MAGAZINE_FEED });
              yield* Operation.invoke(SpaceOperation.AddObject, {
                object: defaultFeed,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
              yield* Operation.schedule(
                FeedOperation.SyncFeed,
                { feed: Ref.make(defaultFeed) },
                { spaceId: Obj.getDatabase(defaultFeed)?.spaceId },
              );
              return defaultFeed;
            }).pipe(Effect.option);

            const initialFeeds = Option.isSome(seededFeed) ? [Ref.make(seededFeed.value)] : [];
            const object = Magazine.make({ ...props, feeds: initialFeeds });
            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });

            // Seed a curation Routine owned by (parented to) the Magazine. Cascade-deleted with it.
            // Best-effort: a seeding failure must not abort Magazine creation.
            yield* Effect.gen(function* () {
              const routine = Routine.make({
                name: 'Curation',
                instructions: DEFAULT_MAGAZINE_INSTRUCTIONS,
              });
              Obj.setParent(routine, object);
              yield* Operation.invoke(SpaceOperation.AddObject, {
                object: routine,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
              Obj.update(object, (object) => {
                (object as Obj.Mutable<typeof object>).routine = Ref.make(routine);
              });
            }).pipe(Effect.option);

            return result;
          }),
      }),
    ];
  }),
);
