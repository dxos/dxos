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
});

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
