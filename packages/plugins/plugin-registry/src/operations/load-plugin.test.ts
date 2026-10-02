//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { RegistryOperation } from '#operations';
import { RegistryPlugin } from '#plugin';

const REMOTE_URL = 'https://example.com/hello/manifest.json';
const remoteMeta = Plugin.makeMeta({ key: DXN.make('org.example.plugin.hello'), name: 'Hello' });
const RemotePlugin = Plugin.make(Plugin.define(remoteMeta));

class UnknownLocatorError extends BaseError.extend('UnknownLocatorError', 'Unknown locator') {}

/** Serves one plugin at {@link REMOTE_URL}, as the URL loader resolves a manifest. */
const remoteLoader = (id: string) =>
  id === REMOTE_URL
    ? Effect.succeed({ plugin: RemotePlugin() })
    : Effect.fail(new UnknownLocatorError({ context: { locator: id } }));

describe('RegistryOperation.LoadPlugin', () => {
  test('loads a plugin by URL and enables it', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin()],
      enabled: [meta.profile.key],
      pluginLoader: remoteLoader,
    });

    const { id, name } = await harness.runPromise(Operation.invoke(RegistryOperation.LoadPlugin, { url: REMOTE_URL }));

    expect(id).toBe(remoteMeta.profile.key);
    expect(name).toBe('Hello');
    expect(harness.manager.getEnabled()).toContain(remoteMeta.profile.key);
  });

  test('loads a plugin without enabling it when asked', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin()],
      enabled: [meta.profile.key],
      pluginLoader: remoteLoader,
    });

    const { id } = await harness.runPromise(
      Operation.invoke(RegistryOperation.LoadPlugin, { url: REMOTE_URL, enable: false }),
    );

    expect(id).toBe(remoteMeta.profile.key);
    expect(harness.manager.getPlugins().map((plugin) => plugin.meta.profile.key)).toContain(remoteMeta.profile.key);
    expect(harness.manager.getEnabled()).not.toContain(remoteMeta.profile.key);
  });

  test('fails for a URL that does not load', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin()],
      enabled: [meta.profile.key],
      pluginLoader: remoteLoader,
    });

    await expect(
      harness.runPromise(Operation.invoke(RegistryOperation.LoadPlugin, { url: 'https://example.com/missing.json' })),
    ).rejects.toThrow('Unknown locator');
    expect(harness.manager.getEnabled()).not.toContain(remoteMeta.profile.key);
  });
});
