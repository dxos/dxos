//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { TimeoutError, Trigger, sleep } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { RpcClosedError } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SystemService } from '@dxos/protocols/rpc';

import { TestBuilder } from '../testing/index.ts';
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

describe('Client.fatalError', () => {
  test('a status stream failure after open is fatal, destroying the client is not', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const closing = new Client({ services: testBuilder.createLocalClientServices() });
    await closing.initialize();
    await closing.destroy();
    expect(closing.fatalError.get()).toBeNull();

    const services = testBuilder.createLocalClientServices();
    await services.open();
    const system = await EffectEx.runPromise(
      services.stack.getServiceResolver().resolve(SystemService.Tag, {}).pipe(Effect.orDie, Effect.scoped),
    );
    const lost = new Trigger();
    const failure = new Error('status stream failed');
    vi.spyOn(system, 'SystemService.queryStatus').mockImplementation(() =>
      Stream.make({ status: SystemStatus.ACTIVE }).pipe(
        Stream.concat(
          Stream.fromEffect(Effect.promise(() => lost.wait())).pipe(Stream.flatMap(() => Stream.fail(failure))),
        ),
      ),
    );

    const client = new Client({ services });
    await client.initialize();
    expect(client.fatalError.get()).toBeNull();

    lost.wake();
    await expect.poll(() => client.fatalError.get()).toBe(failure);
    await client.destroy();
  });

  test('a status stream closed by a lost connection is not fatal', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const services = testBuilder.createLocalClientServices();
    await services.open();
    const system = await EffectEx.runPromise(
      services.stack.getServiceResolver().resolve(SystemService.Tag, {}).pipe(Effect.orDie, Effect.scoped),
    );
    const lost = new Trigger();
    vi.spyOn(system, 'SystemService.queryStatus').mockImplementation(() =>
      Stream.make({ status: SystemStatus.ACTIVE }).pipe(
        Stream.concat(
          Stream.fromEffect(Effect.promise(() => lost.wait())).pipe(
            Stream.flatMap(() => Stream.fail(new RpcClosedError())),
          ),
        ),
      ),
    );

    const client = new Client({ services });
    await client.initialize();
    onTestFinished(() => client.destroy());

    lost.wake();
    await sleep(100);
    expect(client.fatalError.get()).toBeNull();
  });
});

describe('Client.reset', () => {
  test('completes when the host shuts down before answering', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const services = testBuilder.createLocalClientServices();
    await services.open();
    const system = await EffectEx.runPromise(
      services.stack.getServiceResolver().resolve(SystemService.Tag, {}).pipe(Effect.orDie, Effect.scoped),
    );
    vi.spyOn(system, 'SystemService.reset').mockImplementation(() => Effect.fail(new RpcClosedError()));

    const client = new Client({ services });
    await client.initialize();

    await expect(client.reset()).resolves.toBeUndefined();
  });
});
