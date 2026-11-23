//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EdgeCallFailedError, type PluginView } from '@dxos/protocols';

import { EdgeRegistryPluginProvider, type RegistryHttpClient } from './edge-registry-plugin-provider.ts';

const body = (plugins: PluginView[]) => ({ version: 2 as const, refreshedAt: 0, plugins });

const view = (version: string): PluginView => ({
  uri: 'at://did:plc:test/org.dxos.plugin.profile/org.example.clock',
  did: 'did:plc:test',
  indexedAt: 0,
  labels: [],
  profile: { key: 'org.example.clock', name: 'Clock' },
  releases: [{ version, moduleUrl: `https://example.com/${version}/manifest.json` }],
  latestVersion: version,
});

describe('EdgeRegistryPluginProvider', () => {
  test('a private catalog for an identity with no account is empty, not an error', async ({ expect }) => {
    const client: RegistryHttpClient = {
      getRegistryPlugins: async () => body([]),
      getPrivateRegistryPlugins: async () => {
        throw new EdgeCallFailedError({
          message: 'Identity is not associated with an account.',
          data: { type: 'identity_not_associated_with_account' },
        });
      },
    };
    const provider = new EdgeRegistryPluginProvider(client, { catalog: 'private' });

    expect(await EffectEx.runPromise(provider.listPlugins())).toEqual([]);
  });

  test('a private catalog still fails on any other error', async ({ expect }) => {
    const client: RegistryHttpClient = {
      getRegistryPlugins: async () => body([]),
      getPrivateRegistryPlugins: async () => {
        throw new EdgeCallFailedError({ message: 'Internal error.' });
      },
    };
    const provider = new EdgeRegistryPluginProvider(client, { catalog: 'private' });

    await expect(EffectEx.runPromise(provider.listPlugins())).rejects.toThrow();
  });

  test('a superseded response does not overwrite the cache a later one wrote', async ({ expect }) => {
    const slow = new Trigger<ReturnType<typeof body>>();
    const responses = [slow.wait(), Promise.resolve(body([view('2.0.0')]))];
    const client: RegistryHttpClient = {
      getRegistryPlugins: async () => responses.shift() ?? body([]),
      getPrivateRegistryPlugins: async () => body([]),
    };
    const provider = new EdgeRegistryPluginProvider(client);

    const first = EffectEx.runPromise(provider.listPlugins());
    await EffectEx.runPromise(provider.listPlugins());
    slow.wake(body([view('1.0.0')]));
    await first;

    const plugin = await EffectEx.runPromise(provider.getPlugin('org.example.clock'));
    expect(plugin.release?.version).toBe('2.0.0');
  });
});
