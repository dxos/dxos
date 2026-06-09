//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { FeedOperation, Subscription } from '../types';

/**
 * Clears a Magazine's curated posts, preserving any that are starred. With no `starred` tag in the
 * space nothing can be starred, so the whole list is emptied without resolving any posts; otherwise
 * each post (and its distinct source Subscription) is resolved and the starred ones are kept.
 */
const handler: Operation.WithHandler<typeof FeedOperation.ClearMagazine> = FeedOperation.ClearMagazine.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef }) {
      const magazine = yield* Database.load(magazineRef);
      const db = Obj.getDatabase(magazine);
      if (!db || magazine.posts.length === 0) {
        return;
      }
      const starredUri = yield* Effect.promise(() => Subscription.findSystemTagUri(db, 'starred'));

      const next = yield* Option.fromNullable(starredUri).pipe(
        Option.match({
          onNone: () => Effect.succeed<Ref.Ref<Subscription.Post>[]>([]),
          onSome: (uri) =>
            Effect.gen(function* () {
              // Resolve posts concurrently — `Effect.all` defaults to sequential.
              const loaded = yield* Effect.all(
                magazine.posts.map((ref) => Database.load(ref)),
                { concurrency: 'unbounded' },
              );
              // A post's starred flag lives on its Subscription's TagIndex; many posts share one
              // Subscription (a feed has many posts), so resolve each distinct source once.
              const sourceById = new Map<string, Ref.Ref<Subscription.Subscription>>();
              for (const post of loaded) {
                if (post.source) {
                  sourceById.set(EID.getEntityId(EID.parse(post.source.uri)) ?? post.source.uri, post.source);
                }
              }
              const subscriptionEntries = yield* Effect.all(
                [...sourceById].map(([entityId, source]) =>
                  Database.load(source).pipe(
                    // Resolve the child tag index so `hasTag` can read it synchronously below.
                    Effect.tap((subscription) =>
                      Database.load(subscription.tags),
                    ),
                    Effect.map((subscription) => [entityId, subscription] as const),
                  ),
                ),
                { concurrency: 'unbounded' },
              );
              const subscriptionById = new Map(subscriptionEntries);
              return loaded
                .filter((post) =>
                  Subscription.hasTag(
                    post.source
                      ? subscriptionById.get(EID.getEntityId(EID.parse(post.source.uri)) ?? post.source.uri)
                      : undefined,
                    post.id,
                    uri,
                  ),
                )
                .map((post) => Ref.make(post));
            }),
        }),
      );

      if (next.length === magazine.posts.length) {
        return;
      }
      Obj.update(magazine, (magazine) => {
        magazine.posts = next;
      });
    }),
  ),
);

export default handler;
