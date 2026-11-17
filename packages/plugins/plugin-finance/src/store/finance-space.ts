//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import type * as Scope from 'effect/Scope';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Client } from '@dxos/client';
import { Config } from '@dxos/config';
import { Database, Feed, Filter, Obj, type Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import * as Subscription from '@dxos/plugin-magazine/Subscription';

import { Finance } from '#types';

class SpaceNotLoaded extends BaseError.extend('SpaceNotLoaded', 'Space did not load') {}

/** A local, persistent client and the space the finance feeds live in. */
export type FinanceSpace = {
  readonly client: Client;
  readonly db: Database.Database;
};

const TYPES = [Feed.Feed, Finance.Observation, Subscription.Post];

/**
 * Opens (creating on first use) a client whose state persists under `dataRoot`, with an identity and its default
 * space; closed with the scope. Local only: nothing replicates to EDGE.
 */
export const open = (dataRoot: string): Effect.Effect<FinanceSpace, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      mkdirSync(dataRoot, { recursive: true });
      const client = new Client({
        config: new Config({ runtime: { client: { storage: { persistent: true, dataRoot } } } }),
      });
      yield* Effect.promise(() => client.initialize());
      yield* Effect.promise(() => client.addTypes(TYPES));
      if (!client.halo.identity.get()) {
        yield* Effect.promise(() => client.halo.createIdentity());
      }
      // The space's id is kept beside the client's state, since a client has no notion of "the" space to reopen.
      const idFile = join(dataRoot, 'space-id');
      const spaceId = existsSync(idFile) ? readFileSync(idFile, 'utf8').trim() : undefined;
      const space = spaceId
        ? yield* Effect.suspend(() => {
            const found = client.spaces.get().find((candidate) => candidate.id === spaceId);
            return found ? Effect.succeed(found) : Effect.fail(new SpaceNotLoaded({ context: { spaceId } }));
          }).pipe(Effect.retry({ schedule: Schedule.spaced('200 millis'), times: 150 }), Effect.orDie)
        : yield* Effect.promise(() => client.spaces.create());
      writeFileSync(idFile, space.id);
      yield* Effect.promise(() => space.waitUntilReady());
      return { client, db: space.db };
    }),
    ({ client }) => Effect.promise(() => client.destroy()),
  );

/** The feed a source writes to, created on first use. */
export const feedFor = (source: string): Effect.Effect<Feed.Feed, never, Database.Service> =>
  Effect.gen(function* () {
    const kind = Finance.feedKind(source);
    const feeds = yield* Database.query(Filter.type(Feed.Feed)).run;
    const existing = feeds.find((feed) => feed.kind === kind);
    if (existing) {
      return existing;
    }
    return yield* Database.add(Feed.make({ name: source, kind }));
  });

/** The identity of a foreign key, for dedupe. */
export const keyId = (key: { readonly source: string; readonly id: string }): string => `${key.source}|${key.id}`;

/** The foreign keys of an object, as {@link keyId}s. */
export const keysOf = (object: Obj.Unknown | Obj.Snapshot): string[] => Obj.getMeta(object).keys.map(keyId);

/** The items of one type a feed holds. */
export const items = <T extends Type.AnyObj>(
  feed: Feed.Feed,
  type: T,
): Effect.Effect<Type.InstanceType<T>[], never, Database.Service> =>
  Feed.query(feed, Filter.type(type)).run.pipe(Effect.map((found) => [...found]));

/**
 * Appends the items whose foreign key the feed does not hold yet, so a rerun of an ingest adds only what is new.
 * `alsoKeyedBy` names further identities an item is a duplicate under (the same story under another link). Returns how
 * many were added.
 */
export const appendNew = <T extends Type.AnyObj>(
  feed: Feed.Feed,
  type: T,
  candidates: ReadonlyArray<Type.InstanceType<T>>,
  alsoKeyedBy: (item: Type.InstanceType<T>) => string[] = () => [],
): Effect.Effect<number, never, Database.Service> =>
  Effect.gen(function* () {
    const identities = (item: Type.InstanceType<T>) => [...keysOf(item), ...alsoKeyedBy(item)];
    const known = new Set((yield* items(feed, type)).flatMap(identities));
    const fresh = candidates.filter((item) => {
      if (keysOf(item).length === 0) {
        return false;
      }
      const ids = identities(item);
      if (ids.length === 0 || ids.some((id) => known.has(id))) {
        return false;
      }
      ids.forEach((id) => known.add(id));
      return true;
    });
    for (let start = 0; start < fresh.length; start += 200) {
      yield* Feed.append(feed, fresh.slice(start, start + 200));
    }
    yield* Database.flush();
    return fresh.length;
  });
