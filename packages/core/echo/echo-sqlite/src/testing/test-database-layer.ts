//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Feed, Hypergraph, type Type, View } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from './echo-test-builder.ts';

export type TestDatabaseOptions = {
  types?: Type.AnyEntity[];
  /** A fixed key reuses one space across tests, as echo-client's layer does for memoized fixtures. */
  spaceKey?: PublicKey | 'fixed';
  storagePath?: string;
};

const FIXED_SPACE_KEY = PublicKey.from('665c420e0dec9aa36c2bedca567afb0778701920e346eaf83ab2bd3403859723');

const DEFAULT_TYPES: Type.AnyEntity[] = [Feed.Feed, View.View];

/**
 * echo-client's `TestDatabaseLayer` over echo-sqlite: a fresh database of one space, provided as both
 * the database and its graph, closed with the layer's scope.
 */
export const TestDatabaseLayer = ({ types = [], spaceKey, storagePath }: TestDatabaseOptions = {}): Layer.Layer<
  Database.Service | Hypergraph.Service
> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const builder = yield* Effect.acquireRelease(
        Effect.sync(() => new EchoTestBuilder()),
        (builder) => Effect.promise(() => builder.close()),
      );
      const peer = yield* Effect.promise(() =>
        builder.createPeer({ types: [...types, ...DEFAULT_TYPES], storagePath, assignQueuePositions: true }),
      );
      const key = spaceKey === 'fixed' ? FIXED_SPACE_KEY : (spaceKey ?? PublicKey.random());
      const db = yield* Effect.promise(() => peer.createDatabase(key));
      return Context.make(Database.Service, Database.makeService(db)).pipe(
        Context.add(Hypergraph.Service, Hypergraph.makeService(db.graph)),
      );
    }),
  );
