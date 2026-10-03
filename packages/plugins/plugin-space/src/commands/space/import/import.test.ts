//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { type Format, handler as exportSpace } from '../export/index.ts';
import { handler as importSpace } from './import.ts';

const ImportTestLayer = Layer.mergeAll(TestLayer, NodeServices.layer);

describe('space import', () => {
  it('should import a json archive as a new space', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      const { space, path } = yield* exportFixture('json');

      yield* importSpace({ file: path, tags: [] });

      const imported = yield* lastOutput();
      expect(imported.spaceId).not.toEqual(space.id);
      expect(client.spaces.get().some(({ id }) => id === imported.spaceId)).toBe(true);
      expect(imported.name).toEqual('original');
    }).pipe(Effect.provide(ImportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));

  it('should import a binary archive as a new space', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      const { space, path } = yield* exportFixture('binary');

      yield* importSpace({ file: path, tags: [] });

      const imported = yield* lastOutput();
      expect(imported.spaceId).not.toEqual(space.id);
      expect(client.spaces.get().some(({ id }) => id === imported.spaceId)).toBe(true);
    }).pipe(Effect.provide(ImportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));

  it('should apply tags to the imported space', () =>
    Effect.gen(function* () {
      const { path } = yield* exportFixture('json');

      yield* importSpace({ file: path, tags: ['imported'] });

      expect((yield* lastOutput()).tags).toContain('imported');
    }).pipe(Effect.provide(ImportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});

const lastOutput = Effect.fn(function* () {
  const logger = yield* TestConsole.TestConsole;
  return TestConsole.parseJson<{ spaceId: string; name?: string; tags: string[]; path: string }>(
    logger.logs[logger.logs.length - 1],
  );
});

/** Exports a named space and returns the archive path, so import has a real archive to read. */
const exportFixture = Effect.fn(function* (format: Format) {
  const fs = yield* FileSystem.FileSystem;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  const space = yield* Effect.tryPromise(() => client.spaces.create());
  yield* Effect.tryPromise(() => space.waitUntilReady());
  Obj.update(space.properties, (obj) => {
    obj.name = 'original';
  });
  yield* Effect.tryPromise(() => space.db.flush());

  const outputDir = yield* fs.makeTempDirectoryScoped();
  yield* exportSpace({ spaceId: Option.some(space.id), output: Option.some(outputDir), format });
  return { space, path: (yield* lastOutput()).path };
});
