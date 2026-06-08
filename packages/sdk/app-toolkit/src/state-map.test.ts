//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, DXN, Obj, Type } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { EffectEx } from '@dxos/effect';

const { runAndForwardErrors } = EffectEx;
import { type EntityId } from '@dxos/keys';

import * as StateMap from './StateMap';

const PostState = Schema.Struct({
  readAt: Schema.optional(Schema.String),
  imageUrl: Schema.optional(Schema.String),
});

const Host = Schema.Struct({
  postState: StateMap.field(PostState),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.statemap.Host', '0.1.0')));

describe('StateMap (database integration)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Regression for DX-984 consistency: patch() for new entries must initialize via the ECHO proxy
  // (not plain-object spread) so each field assignment flows through the proxy, not a detached object.
  test('patch emits O(1) Automerge ops per entry (no per-entry overhead growth)', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Host] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const host = yield* Database.add(Obj.make(Host, {}));
      yield* Database.flush();

      const state = StateMap.bind(host, 'postState');
      const core = getObjectCore(host);
      const N = 200;

      const opsBefore = A.stats(core.getDoc()).numOps;
      for (let i = 0; i < N; i++) {
        state.patch(`id-${i}` as EntityId, { readAt: `t${i}` });
      }
      const totalOps = A.stats(core.getDoc()).numOps - opsBefore;

      // Each new entry: makeMap + set field ≈ 2–3 ops, well under 10 per entry.
      expect(totalOps).toBeLessThan(N * 10);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });
});
