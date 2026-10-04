//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import type * as Plugin from './plugin.ts';
import * as Registry from './registry.ts';

class LookupError extends Data.TaggedError('LookupError')<{ message: string }> {}

const meta = (key: string, moduleUrl: string): Plugin.Meta => ({
  profile: { key, name: key },
  release: { version: '1.0.0', moduleUrl },
});

const provider = (entries: readonly Plugin.Meta[]): Registry.PluginProvider => ({
  listPlugins: () => Effect.succeed(entries),
  listVersions: (id) =>
    entries.some((entry) => entry.profile.key === id)
      ? Effect.succeed(entries.flatMap((entry) => (entry.release ? [entry.release] : [])))
      : Effect.fail(new LookupError({ message: `not found: ${id}` })),
  getPlugin: (id) => {
    const entry = entries.find((candidate) => candidate.profile.key === id);
    return entry ? Effect.succeed(entry) : Effect.fail(new LookupError({ message: `not found: ${id}` }));
  },
});

/** Resolves once the manager's catalog has settled. */
const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manager) =>
  new Promise<Registry.PluginsState>((resolve) => {
    const check = () => {
      const state = registry.get(manager.plugins);
      if (!state.loading) {
        resolve(state);
      } else {
        setTimeout(check, 1);
      }
    };
    check();
  });

describe('Registry.Manager', () => {
  test('merges an added provider into the catalog, keeping the first entry of a shared key', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const manager = new Registry.Manager(
      provider([meta('org.example.public', 'https://public/a'), meta('org.example.shared', 'https://public/b')]),
      registry,
    );
    expect((await settled(registry, manager)).entries.map((entry) => entry.profile.key)).toEqual([
      'org.example.public',
      'org.example.shared',
    ]);

    manager.addProvider(
      provider([meta('org.example.private', 'https://private/c'), meta('org.example.shared', 'https://private/d')]),
    );
    const { entries } = await settled(registry, manager);
    expect(entries.map((entry) => entry.release?.moduleUrl)).toEqual([
      'https://public/a',
      'https://public/b',
      'https://private/c',
    ]);
  });

  test('drops a removed provider from the catalog and from lookups', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const manager = new Registry.Manager(provider([meta('org.example.public', 'https://public/a')]), registry);
    const privateProvider = provider([meta('org.example.private', 'https://private/c')]);
    manager.addProvider(privateProvider);
    expect((await settled(registry, manager)).entries).toHaveLength(2);

    manager.removeProvider(privateProvider);
    expect((await settled(registry, manager)).entries.map((entry) => entry.profile.key)).toEqual([
      'org.example.public',
    ]);
    await expect(EffectEx.runPromise(manager.getPlugin('org.example.private'))).rejects.toThrow();
  });

  test('resolves a plugin from whichever provider lists it', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const manager = new Registry.Manager(provider([meta('org.example.public', 'https://public/a')]), registry);
    manager.addProvider(provider([meta('org.example.private', 'https://private/c')]));

    const plugin = await EffectEx.runPromise(manager.getPlugin('org.example.private'));
    expect(plugin.release?.moduleUrl).toBe('https://private/c');
    await expect(EffectEx.runPromise(manager.getPlugin('org.example.missing'))).rejects.toThrow();
  });

  test('keeps the catalog of the providers that answer when one fails', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const manager = new Registry.Manager(provider([meta('org.example.public', 'https://public/a')]), registry);
    manager.addProvider({
      listPlugins: () => Effect.fail(new LookupError({ message: 'unreachable' })),
      listVersions: () => Effect.fail(new LookupError({ message: 'unreachable' })),
      getPlugin: () => Effect.fail(new LookupError({ message: 'unreachable' })),
    });

    const state = await settled(registry, manager);
    expect(state.entries.map((entry) => entry.profile.key)).toEqual(['org.example.public']);
    expect(state.error?.message).toBe('unreachable');
  });
});
