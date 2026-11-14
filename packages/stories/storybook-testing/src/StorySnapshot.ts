//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type { Client } from '@dxos/client';

/** Initializes a client from a serialized space archive (`.dx.json`). */
export const initClient: {
  (loadSnapshotJson: () => Promise<unknown>): (options: { client: Client }) => Effect.Effect<void>;
} =
  (loadSnapshotJson) =>
  ({ client }) =>
    Effect.promise(async () => {
      await client.halo.createIdentity();
      const data = await loadSnapshotJson();
      const space = await client.spaces.import({
        filename: 'snapshot.dx.json',
        contents: new TextEncoder().encode(JSON.stringify(data)),
      });
      await space.waitUntilReady();
      await space.db.flush();
    });
