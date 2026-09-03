//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { TimeoutError } from '@dxos/async';

import { Client } from './client.ts';

describe('Client.waitUntilInitialized', () => {
  test('resolves once initialize completes', async () => {
    const client = new Client();
    const waiting = client.waitUntilInitialized();
    await client.initialize();
    await expect(waiting).resolves.toBeUndefined();
    await client.destroy();
  });

  test('resolves immediately when already initialized', async () => {
    const client = new Client();
    await client.initialize();
    // The short bound asserts the trigger is already awake, not that the window is generous.
    await expect(client.waitUntilInitialized({ timeout: 100 })).resolves.toBeUndefined();
    await client.destroy();
  });

  test('rejects with TimeoutError when initialization does not complete in time', async () => {
    const client = new Client();
    await expect(client.waitUntilInitialized({ timeout: 100 })).rejects.toBeInstanceOf(TimeoutError);
  });

  test('waits indefinitely by default', async () => {
    // Opt-in only: bounding the session belongs to the app entry point, so an internal consumer
    // that never passes a timeout must not start failing on its own.
    const client = new Client();
    const settled = await Promise.race([
      client.waitUntilInitialized().then(() => 'settled' as const),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 100)),
    ]);
    expect(settled).toEqual('pending');
  });

  test('goes back to pending after destroy', async () => {
    // A resolved trigger on an uninitialized client spins `useClient`: it throws an
    // already-settled promise, React retries, and it suspends again.
    const client = new Client();
    await client.initialize();
    await client.destroy();
    expect(client.initialized).toBeFalsy();

    const settled = await Promise.race([
      client.waitUntilInitialized().then(() => 'settled' as const),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 100)),
    ]);
    expect(settled).toEqual('pending');
  });

  test('resolves again after re-initialization', async () => {
    const client = new Client();
    await client.initialize();
    await client.destroy();
    await client.initialize();
    await expect(client.waitUntilInitialized({ timeout: 100 })).resolves.toBeUndefined();
    await client.destroy();
  });
});
