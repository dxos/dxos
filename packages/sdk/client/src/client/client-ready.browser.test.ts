//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import { TimeoutError, Trigger } from '@dxos/async';
import { ContextDisposedError } from '@dxos/context';

import { BootCacheStore, ServicesUnavailableError } from '../services/boot-cache/index.ts';
import { TestBuilder } from '../testing/index.ts';
import { Client } from './client.ts';

/** Runs one session against fresh services and writes its boot cache, as hiding the page does. */
const writeSnapshot = async (testBuilder: TestBuilder) => {
  const client = new Client({ services: testBuilder.createLocalClientServices(), bootCache: {} });
  await client.initialize();
  await client.waitUntilServicesReady();
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  document.dispatchEvent(new Event('visibilitychange'));
  visibility.mockRestore();
  // Waits for the write the event queued.
  await client.destroy();
  expect(await new BootCacheStore().read()).toBeDefined();
};

describe('Client readiness with a boot cache', () => {
  afterEach(async () => {
    await new BootCacheStore().clear();
  });

  test('is ready from the cache before its services are', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    await writeSnapshot(testBuilder);

    const gate = new Trigger();
    const client = new Client({
      services: testBuilder.createLocalClientServices(),
      bootCache: { servicesGate: () => gate.wait() },
    });
    onTestFinished(() => client.destroy());
    await client.initialize();
    expect(client.initialized).toBe(true);
    expect(client.servicesReady).toBe(false);
    // The gate is still closed, so the services cannot have answered.
    await expect(client.waitUntilServicesReady({ timeout: 100 })).rejects.toBeInstanceOf(TimeoutError);

    gate.wake();
    await expect(client.waitUntilServicesReady()).resolves.toBeUndefined();
    expect(client.servicesReady).toBe(true);
  });

  test('rejects a pending services signal when the client is destroyed first', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    await writeSnapshot(testBuilder);

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
      bootCache: { servicesGate: () => new Promise(() => {}) },
    });
    await client.initialize();
    const servicesReady = client.waitUntilServicesReady();
    await client.destroy();
    await expect(servicesReady).rejects.toBeInstanceOf(ContextDisposedError);
  });

  test('rejects the services signal when the services fail to open', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    await writeSnapshot(testBuilder);

    const services = testBuilder.createLocalClientServices();
    vi.spyOn(services, 'open').mockRejectedValue(new Error('worker failed'));
    const client = new Client({ services, bootCache: {} });
    await client.initialize();
    expect(client.initialized).toBe(true);
    await expect(client.waitUntilServicesReady()).rejects.toBeInstanceOf(ServicesUnavailableError);
    expect(client.servicesReady).toBe(false);
  });
});
