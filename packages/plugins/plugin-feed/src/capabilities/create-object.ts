//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { Blueprint, Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { MagazineBlueprint } from '#blueprints';
import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

/** Starter feed seeded into every newly created Magazine. */
const DEFAULT_MAGAZINE_FEED = {
  name: 'EFF Updates',
  url: 'https://www.eff.org/rss/updates.xml',
  type: 'rss',
} as Subscription.Subscription;

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
            // Best-effort: a seeding failure must not abort Magazine creation.
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

            // Find or create the magazine Blueprint entity using the seeded feed's db.
            // Best-effort: if db is unavailable the routine starts with no blueprint.
            const blueprintRef = yield* Effect.gen(function* () {
              const db = Option.isSome(seededFeed) ? Obj.getDatabase(seededFeed.value) : undefined;
              if (!db) {
                return undefined;
              }
              const existing = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
              const blueprint =
                existing.find((b) => Obj.getMeta(b).key === Magazine.BLUEPRINT_KEY) ??
                db.add(MagazineBlueprint.make());
              return Ref.make(blueprint);
            }).pipe(Effect.option);

            const { magazine, routine } = Magazine.make({
              ...props,
              feeds: initialFeeds,
              blueprint: Option.isSome(blueprintRef) ? (blueprintRef.value ?? undefined) : undefined,
            });

            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object: magazine,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });

            // Seed the companion Routine (hidden, cascade-deleted with magazine). Best-effort.
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
