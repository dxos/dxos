//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, onTestFinished, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { SpaceMetadataSchema } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { SqliteMetadataStore } from './sqlite-metadata-store.ts';

const setup = async () => {
  const managed = ManagedRuntime.make(layerMemory.pipe(Layer.orDie));
  onTestFinished(() => managed.dispose());
  const run = RuntimeProvider.runPromise(managed.contextEffect);
  const open = async () => {
    const store = new SqliteMetadataStore({ runtime: managed.contextEffect });
    await run(store.migrate);
    await store.load();
    return store;
  };
  const rows = () =>
    run(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ key: string }>`SELECT key FROM space_metadata`;
      }),
    );
  // Dropping the row behind the store's back makes any later save visible as a reappearing row.
  const dropRows = () =>
    run(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM space_metadata`;
      }),
    );
  return { open, rows, dropRows };
};

describe('SqliteMetadataStore', () => {
  test('a save that changes nothing but the timestamp is not written', async ({ expect }) => {
    const { open, rows, dropRows } = await setup();
    const spaceKey = PublicKey.random();

    const store = await open();
    await store.addSpace(create(SpaceMetadataSchema, { key: fromPublicKey(spaceKey), state: SpaceState.SPACE_ACTIVE }));
    expect(await rows()).toHaveLength(1);
    await store.close();

    // A reopened store compares against what it loaded, as a returning profile's boot does.
    const reopened = await open();
    await dropRows();
    await reopened.setSpaceState(spaceKey, SpaceState.SPACE_ACTIVE);
    expect(await rows()).toHaveLength(0);

    await reopened.setSpaceState(spaceKey, SpaceState.SPACE_INACTIVE);
    expect(await rows()).toHaveLength(1);

    await dropRows();
    await reopened.close();
    expect(await rows()).toHaveLength(0);
  });
});
