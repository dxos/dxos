//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as PlatformError from 'effect/PlatformError';
import { describe, expect, test } from 'vitest';

import { ConfigService } from './config-service';

const PROFILE = 'test-profile';
const CONFIG_PATH = '/tmp/dxos-config-service-test/config.yml';

type Written = { path: string; content: string };

/**
 * Stubs only the calls `ConfigService.load` makes, with `readFileString` reporting the missing-file
 * failure that drives the first-run branch.
 */
const stubFileSystem = (written: Written[]) =>
  FileSystem.layerNoop({
    readFileString: (path: string) =>
      Effect.fail(
        PlatformError.systemError({
          _tag: 'NotFound',
          module: 'FileSystem',
          method: 'readFileString',
          pathOrDescriptor: path,
        }),
      ),
    makeDirectory: () => Effect.void,
    writeFileString: (path: string, content: string) =>
      Effect.sync(() => {
        written.push({ path, content });
      }),
  });

describe('ConfigService.load first run', () => {
  test('writes an endpoint-free profile but still applies the builtin defaults', async () => {
    const written: Written[] = [];
    const config = await ConfigService.load({ config: Option.some(CONFIG_PATH), profile: PROFILE }).pipe(
      Effect.provide(stubFileSystem(written)),
      Effect.runPromise,
    );

    // The file materialized on disk records user choices only — no services block, so no endpoint
    // can be smuggled into a fresh profile.
    expect(written).toHaveLength(1);
    expect(written[0].path).toEqual(CONFIG_PATH);
    expect(written[0].content).not.toMatch(/services:/);
    expect(written[0].content).not.toMatch(/dxos\.(network|org)/);

    // ...while the loaded config still carries storage + edge features from the builtins, exactly
    // as the read path does.
    expect(config.values.runtime?.client?.storage?.persistent).toBe(true);
    expect(config.values.runtime?.client?.edgeFeatures?.subductionReplicator).toBe(true);
    expect(config.values.runtime?.services?.edgeServices).toBeUndefined();
  });
});
