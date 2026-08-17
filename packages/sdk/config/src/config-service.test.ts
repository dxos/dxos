//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import { afterEach } from 'vitest';

import { DEFAULT_HUB_URL } from '@dxos/client-protocol';

import { ConfigService } from './config-service';

const HUB_URL = 'runtime.app.env.DX_HUB_URL';

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

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
});

const writeConfig = Effect.fn(function* (contents: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = `${yield* fs.makeTempDirectoryScoped()}/config.yml`;
  yield* fs.writeFileString(path, contents);
  return path;
});

describe('ConfigService.load', () => {
  it('resolves a hub URL for a profile that does not configure one', () =>
    Effect.gen(function* () {
      restoreEnv = withEnv({ DX_HUB_URL: undefined });
      const path = yield* writeConfig('version: 1\n');
      const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
      expect(config.get(HUB_URL)).toEqual(DEFAULT_HUB_URL);
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped));

  it('prefers the profile config file over the built-in default', () =>
    Effect.gen(function* () {
      restoreEnv = withEnv({ DX_HUB_URL: undefined });
      const path = yield* writeConfig('version: 1\nruntime:\n  app:\n    env:\n      DX_HUB_URL: https://hub.test/\n');
      const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
      expect(config.get(HUB_URL)).toEqual('https://hub.test/');
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped));

  it('lets DX_* env override the profile config file', () =>
    Effect.gen(function* () {
      restoreEnv = withEnv({ DX_HUB_URL: 'https://hub.env/' });
      const path = yield* writeConfig('version: 1\nruntime:\n  app:\n    env:\n      DX_HUB_URL: https://hub.test/\n');
      const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
      expect(config.get(HUB_URL)).toEqual('https://hub.env/');
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped));

  it('applies the profile defaults to a freshly created config file', () =>
    Effect.gen(function* () {
      restoreEnv = withEnv({ DX_HUB_URL: undefined });
      const fs = yield* FileSystem.FileSystem;
      const path = `${yield* fs.makeTempDirectoryScoped()}/missing/config.yml`;
      const config = yield* ConfigService.load({ config: Option.some(path), profile: 'test' });
      expect(config.get(HUB_URL)).toEqual(DEFAULT_HUB_URL);
      // The defaults track the code, so they are not baked into the file that was just written.
      expect(yield* fs.readFileString(path)).not.toContain('DX_HUB_URL');
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped));
});
