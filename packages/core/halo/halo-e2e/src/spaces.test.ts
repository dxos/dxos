//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Space } from '@dxos/halo';
import { SpaceId } from '@dxos/keys';

import { createClients, runWith } from './testing';

describe('Spaces', () => {
  test('creates a space', async () => {
    const [client] = await createClients(1);

    const info = await runWith(client, Space.create({ name: 'notes' }));
    expect(SpaceId.isValid(info.id)).toBe(true);

    await runWith(client, Space.waitReady(info.id));

    const resolved = await runWith(client, Space.get(info.id));
    expect(Option.getOrThrow(resolved).id).toEqual(info.id);
  });

  test('lists spaces', async () => {
    const [client] = await createClients(1);

    const before = await runWith(client, Space.list);
    await runWith(
      client,
      Effect.flatMap(Space.create({ name: 'one' }), (info) => Space.waitReady(info.id)),
    );
    const after = await runWith(client, Space.list);

    expect(after.length).toEqual(before.length + 1);
  });

  test('a fresh space has one (admin) member', async () => {
    const [client] = await createClients(1);

    const info = await runWith(client, Space.create({ name: 'solo' }));
    await runWith(client, Space.waitReady(info.id));

    const members = await runWith(client, Space.members(info.id));
    expect(members).toHaveLength(1);
    expect(members[0].role).toEqual('admin');
  });

  test('get returns none for an unknown space', async () => {
    const [client] = await createClients(1);
    const resolved = await runWith(client, Space.get(SpaceId.random()));
    expect(Option.isNone(resolved)).toBe(true);
  });

  test('exports and imports a space archive', async () => {
    const [client] = await createClients(1);

    const source = await runWith(client, Space.create({ name: 'source' }));
    await runWith(client, Space.waitReady(source.id));

    const archive = await runWith(client, Space.exportSpace(source.id));
    expect(archive.contents.length).toBeGreaterThan(0);

    const imported = await runWith(client, Space.importSpace(archive));
    await runWith(client, Space.waitReady(imported.id));
    // Import creates a distinct space.
    expect(imported.id).not.toEqual(source.id);
  });
});
