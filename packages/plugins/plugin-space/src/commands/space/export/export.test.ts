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
import { EffectEx } from '@dxos/effect';

import { handler } from './export.ts';

const ExportTestLayer = Layer.mergeAll(TestLayer, NodeServices.layer);

type ExportOutput = { spaceId: string; format: string; path: string; size: number };

describe('space export', () => {
  it('should write a json export into an output directory', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const space = yield* createSpace();

      const outputDir = yield* fs.makeTempDirectoryScoped();
      yield* handler({ spaceId: Option.some(space.id), output: Option.some(outputDir), format: 'json' });

      const { spaceId, format, path, size } = yield* lastOutput();
      expect(spaceId).toEqual(space.id);
      expect(format).toEqual('json');
      expect(path.startsWith(outputDir)).toBe(true);
      expect(path.endsWith('.dx.json')).toBe(true);
      expect(size).toBeGreaterThan(0);

      const contents = JSON.parse(yield* fs.readFileString(path));
      expect(contents.originalSpaceId).toEqual(space.id);
    }).pipe(Effect.provide(ExportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));

  it('should write a binary export to an explicit file path', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const space = yield* createSpace();

      const outputPath = `${yield* fs.makeTempDirectoryScoped()}/nested/space.tar`;
      yield* handler({ spaceId: Option.some(space.id), output: Option.some(outputPath), format: 'binary' });

      const { format, path } = yield* lastOutput();
      expect(format).toEqual('binary');
      expect(path).toEqual(outputPath);
      expect((yield* fs.stat(outputPath)).type).toEqual('File');
    }).pipe(Effect.provide(ExportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});

const createSpace = Effect.fn(function* () {
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  const space = yield* Effect.tryPromise(() => client.spaces.create());
  yield* Effect.tryPromise(() => space.waitUntilReady());
  return space;
});

const lastOutput = Effect.fn(function* () {
  const logger = yield* TestConsole.TestConsole;
  return TestConsole.parseJson<ExportOutput>(logger.logs[logger.logs.length - 1]);
});
