//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test, vi } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import { createTestApp } from '@dxos/app-framework/testing';

import { meta } from '#meta';
import { HelpCapabilities } from '#types';

import { HelpState } from './index.ts';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
  clear: () => storage.clear(),
});

const createApp = async () => {
  const harness = await createTestApp({
    plugins: [Plugin.define(meta).pipe(Plugin.addModule(HelpState), Plugin.make)()],
  });
  await harness.fire(ActivationEvents.Idle);
  return harness;
};

const legacyState = { running: false, showHints: true, showWelcome: true, seenTours: ['a', 'b'] };

describe('help state', () => {
  beforeEach(() => storage.clear());

  test('seeds and persists seen tours from the legacy record on activation', async ({ expect }) => {
    storage.set('org.dxos.plugin.support.state', JSON.stringify(legacyState));
    await using harness = await createApp();
    expect(JSON.parse(storage.get('org.dxos.plugin.support.tours') ?? '{}')).toEqual({ a: true, b: true });
    expect(harness.registry.get(harness.get(HelpCapabilities.SeenTours))).toEqual({ a: true, b: true });
  });

  test('merges the legacy record into existing seen tours', async ({ expect }) => {
    storage.set('org.dxos.plugin.support.state', JSON.stringify(legacyState));
    storage.set('org.dxos.plugin.support.tours', JSON.stringify({ b: true, c: true }));
    await using harness = await createApp();
    expect(JSON.parse(storage.get('org.dxos.plugin.support.tours') ?? '{}')).toEqual({ a: true, b: true, c: true });
  });

  test('starts empty without a legacy record', async ({ expect }) => {
    await using harness = await createApp();
    expect(harness.registry.get(harness.get(HelpCapabilities.SeenTours))).toEqual({});
  });
});
