//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as NodeCrypto from 'node:crypto';

import { Database, Feed, Type, View } from '@dxos/echo';
import { type DatabaseImpl } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

const testBuilder = EffectEx.acquireReleaseResource(() => new EchoTestBuilder());

export const testStoragePath = ({ name = PublicKey.random().toHex() }: { name?: string }) => {
  return `/tmp/dxos-${name}`;
};

const FIXED_SPACE_KEY = PublicKey.from('665c420e0dec9aa36c2bedca567afb0778701920e346eaf83ab2bd3403859723');

const deriveKeyFromStoragePath = (storagePath: string): PublicKey =>
  PublicKey.from(NodeCrypto.createHash('sha256').update(storagePath).digest('hex'));

const DEFAULT_TYPES = [Feed.Feed, View.View];

export type TestDatabaseOptions = {
  types?: Type.AnyEntity[];
  /**
   * Setting this to fixed will use the same space key for all tests.
   * Important for tests with memoization.
   */
  spaceKey?: PublicKey | 'fixed';
  storagePath?: string;
  onInit?: () => Effect.Effect<void, never, Database.Service>;

  /**
   * Runs after the home database is created, with the same peer, so a test can create sibling spaces
   * on the shared in-process Hypergraph (cross-space / agent-firewall tests). Use fixed space keys so
   * memoized conversations stay deterministic; capture the created database handles via closure.
   */
  onPeerReady?: (peer: EchoTestPeer) => Effect.Effect<void, never, never>;
};

export const TestDatabaseLayer = ({
  types,
  spaceKey,
  storagePath,
  onInit,
  onPeerReady,
}: TestDatabaseOptions = {}): Layer.Layer<Database.Service, never, never> =>
  Layer.scopedContext(
    Effect.gen(function* () {
      types ??= [];
      types.push(...DEFAULT_TYPES);
      types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

      // A storage-derived key must be reproducible across reopens of the same peer, since the
      // persisted space is looked up by the id derived from this key, not stored alongside it.
      const key =
        spaceKey === 'fixed'
          ? FIXED_SPACE_KEY
          : (spaceKey ?? (storagePath ? deriveKeyFromStoragePath(storagePath) : PublicKey.random()));

      const builder = yield* testBuilder;

      const peer = yield* Effect.promise(() => builder.createPeer({ types, storagePath, assignQueuePositions: true }));

      let db: DatabaseImpl | undefined;

      if (storagePath) {
        log('starting persistant test db', { storagePath });
        const persistedSpaces = peer.host.spaces;
        if (persistedSpaces.length === 0) {
          db = yield* Effect.promise(() => peer.createDatabase(key));

          if (onInit) {
            yield* onInit().pipe(Effect.provideService(Database.Service, Database.makeService(db)));
          }
        } else {
          db = yield* Effect.promise(() => peer.openDatabase(key));
          // Rebuild index after reopening since in-memory SQLite is recreated.
          yield* Effect.promise(() => db!.flush());
        }
      } else {
        db = yield* Effect.promise(() => peer.createDatabase(key));
        if (onInit) {
          yield* onInit().pipe(Effect.provideService(Database.Service, Database.makeService(db)));
        }
      }

      if (onPeerReady) {
        yield* onPeerReady(peer);
      }

      return Context.make(Database.Service, Database.makeService(db));
    }),
  );
