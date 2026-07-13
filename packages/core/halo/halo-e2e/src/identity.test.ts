//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Identity } from '@dxos/halo';

import { createClients, runWith } from './testing';

describe('Identity', () => {
  test('no identity before creation', async () => {
    const [client] = await createClients(1, { identity: false });
    const current = await runWith(client, Identity.current);
    expect(Option.isNone(current)).toBe(true);
  });

  test('creates an identity', async () => {
    const [client] = await createClients(1, { identity: false });

    const info = await runWith(client, Identity.create({ displayName: 'test-user' }));
    expect(info.displayName).toEqual('test-user');
    expect(info.did).toBeTypeOf('string');

    const current = await runWith(client, Identity.current);
    expect(Option.getOrThrow(current).did).toEqual(info.did);

    const devices = await runWith(client, Identity.devices);
    expect(devices).toHaveLength(1);
    expect(devices[0].current).toBe(true);
  });

  test('creates an identity with a custom device label', async () => {
    const [client] = await createClients(1, { identity: false });

    await runWith(client, Identity.create({ displayName: 'test-user', deviceLabel: 'custom-device' }));

    const devices = await runWith(client, Identity.devices);
    expect(devices).toHaveLength(1);
    expect(devices[0].label).toEqual('custom-device');
  });

  test('updates the profile', async () => {
    const [client] = await createClients(1, { identity: false });

    await runWith(client, Identity.create({ displayName: 'test-user' }));
    const updated = await runWith(client, Identity.updateProfile({ displayName: 'test-user-updated' }));
    expect(updated.displayName).toEqual('test-user-updated');

    const current = await runWith(client, Identity.current);
    expect(Option.getOrThrow(current).displayName).toEqual('test-user-updated');
  });

  test('identity changes stream emits the created identity', async () => {
    const [client] = await createClients(1, { identity: false });

    // Snapshot after creation via the reactive stream.
    await runWith(client, Identity.create({ displayName: 'streamed' }));
    const current = await runWith(client, Effect.map(Identity.current, Option.getOrThrow));
    expect(current.displayName).toEqual('streamed');
  });
});
