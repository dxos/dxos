//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import { afterEach, describe, test } from 'vitest';

import { DEFAULT_HUB_URL } from '@dxos/client-protocol';
import { EffectEx } from '@dxos/effect';

import { ConfigService } from './config-service';

const HUB_SERVICE_URL = 'runtime.services.hub.url';
const HUB_ENV_URL = 'runtime.app.env.DX_HUB_URL';

let restoreEnv: (() => void) | undefined;

describe('ConfigService.load', () => {
  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
  });

  test('falls back to the built-in hub for a profile that configures none', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const config = await load('version: 1\n');
    expect(config.get(HUB_SERVICE_URL)).toEqual(DEFAULT_HUB_URL);
    expect(config.get(HUB_ENV_URL)).toBeUndefined();
  });

  test('keeps the hub a profile configures for itself', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const config = await load('version: 1\nruntime:\n  services:\n    hub:\n      url: https://hub.test/\n');
    expect(config.get(HUB_SERVICE_URL)).toEqual('https://hub.test/');
    // Nothing may write the higher-precedence key, or the configured URL would never be read.
    expect(config.get(HUB_ENV_URL)).toBeUndefined();
  });

  test('lets DX_* env override the profile config file', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: 'https://hub.env/' });
    const config = await load('version: 1\nruntime:\n  app:\n    env:\n      DX_HUB_URL: https://hub.file/\n');
    expect(config.get(HUB_ENV_URL)).toEqual('https://hub.env/');
  });

  test('applies the profile defaults to a freshly created config file', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const { config, contents } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = `${yield* fs.makeTempDirectoryScoped()}/missing/config.yml`;
        const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
        return { config, contents: yield* fs.readFileString(path) };
      }).pipe(Effect.provide(NodeServices.layer), Effect.scoped),
    );

    expect(config.get(HUB_SERVICE_URL)).toEqual(DEFAULT_HUB_URL);
    // The defaults track the code, so they are not baked into the file that was just written.
    expect(contents).not.toContain('hub');
  });

  test('writes no endpoint into a freshly created config file', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const { config, contents } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = `${yield* fs.makeTempDirectoryScoped()}/missing/config.yml`;
        const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
        return { config, contents: yield* fs.readFileString(path) };
      }).pipe(Effect.provide(NodeServices.layer), Effect.scoped),
    );

    // A first run records user choices only, so no edge endpoint can reach disk without consent.
    expect(contents).not.toContain('services:');
    expect(contents).not.toMatch(/dxos\.(network|org)/);
    expect(config.values.runtime?.services?.edge?.url).toBeUndefined();
    expect(config.values.runtime?.services?.edgeServices).toBeUndefined();

    // ...while the builtins that track the code still apply on the first-run branch.
    expect(config.values.runtime?.client?.storage?.persistent).toBe(true);
    expect(config.values.runtime?.client?.edgeFeatures?.subductionReplicator).toBe(true);
  });

  test('migrates a profile an earlier version seeded with endpoints', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const { config, contents } = await loadAndReread(LEGACY_PROFILE);

    // Nothing chose these; an earlier `defaultConfig` wrote them on first run.
    expect(config.values.runtime?.services?.edge?.url).toBeUndefined();
    expect(config.values.runtime?.services?.iceProviders).toBeUndefined();
    expect(config.values.runtime?.services?.ipfs).toBeUndefined();

    // The file itself is rewritten, so every other reader of the profile sees the same thing.
    expect(contents).not.toContain('dxos.network');

    // Settings the profile legitimately carries are untouched.
    expect(config.values.runtime?.client?.storage?.persistent).toBe(true);
  });

  test('keeps endpoints a profile configures for itself', async ({ expect }) => {
    restoreEnv = withEnv({ DX_HUB_URL: undefined });
    const configured = [
      'version: 1',
      'runtime:',
      '  services:',
      '    edge:',
      '      url: wss://edge.test/',
      '    ipfs:',
      '      server: https://ipfs.test/api',
      '      gateway: https://ipfs.test/gateway',
      '',
    ].join('\n');
    const { config, contents } = await loadAndReread(configured);

    expect(config.values.runtime?.services?.edge?.url).toEqual('wss://edge.test/');
    expect(config.values.runtime?.services?.ipfs?.server).toEqual('https://ipfs.test/api');
    // Untouched: no rewrite happens when there is nothing to remove.
    expect(contents).toEqual(configured);
  });
});

/** A profile as the removed `defaultConfig` used to write it on first run. */
const LEGACY_PROFILE = [
  'version: 1',
  'runtime:',
  '  client:',
  '    storage:',
  '      persistent: true',
  '  services:',
  '    edge:',
  '      url: wss://dxos.network/',
  '    iceProviders:',
  '      - urls: https://dxos.network/ice',
  '    ipfs:',
  '      server: https://api.ipfs.dxos.network/api/v0',
  '      gateway: https://gateway.ipfs.dxos.network/ipfs',
  '',
].join('\n');

/** Loads a profile from `contents` and reads the file back, to observe any migration write. */
const loadAndReread = (contents: string) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = `${yield* fs.makeTempDirectoryScoped()}/config.yml`;
      yield* fs.writeFileString(path, contents);
      const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
      return { config, contents: yield* fs.readFileString(path) };
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped),
  );

/** Loads a profile config from `contents` written to a temp file. */
const load = (contents: string) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = `${yield* fs.makeTempDirectoryScoped()}/config.yml`;
      yield* fs.writeFileString(path, contents);
      return yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped),
  );

/** Applies `values` to `process.env` (undefined deletes) and returns the undo. */
const withEnv = (values: Record<string, string | undefined>) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const apply = (entries: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  apply(values);
  return () => apply(previous);
};
