//
// Copyright 2026 DXOS.org
//

import * as NodeContext from '@effect/platform-node/NodeContext';
import * as FileSystem from '@effect/platform/FileSystem';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { EffectEx } from '@dxos/effect';

import { handler as archive } from './archive';
import { handler as snapshot } from './snapshot';

const ExportTestLayer = Layer.mergeAll(TestLayer, NodeContext.layer);

type ExportOutput = { spaceId: string; path: string; size: number };

const createSpace = Effect.fn(function* () {
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  const space = yield* Effect.tryPromise(() => client.spaces.create());
  yield* Effect.tryPromise(() => space.waitUntilReady());
  return space;
});

describe('space snapshot/archive', () => {
  it('should write a JSON snapshot into an output directory', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const space = yield* createSpace();

      const outputDir = yield* fs.makeTempDirectoryScoped();
      yield* snapshot({ spaceId: Option.some(space.id), output: Option.some(outputDir) });

      const logger = yield* TestConsole.TestConsole;
      const { spaceId, path, size } = TestConsole.parseJson<ExportOutput>(logger.logs[0]);
      expect(spaceId).toEqual(space.id);
      expect(path.startsWith(outputDir)).toBe(true);
      expect(path.endsWith('.dx.json')).toBe(true);
      expect(size).toBeGreaterThan(0);

      const contents = JSON.parse(yield* fs.readFileString(path));
      expect(contents.originalSpaceId).toEqual(space.id);
    }).pipe(Effect.provide(ExportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));

  it('should write a binary archive to an explicit file path', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const space = yield* createSpace();

      const outputPath = `${yield* fs.makeTempDirectoryScoped()}/nested/space.tar`;
      yield* archive({ spaceId: Option.some(space.id), output: Option.some(outputPath) });

      const logger = yield* TestConsole.TestConsole;
      expect(TestConsole.parseJson<ExportOutput>(logger.logs[0]).path).toEqual(outputPath);
      expect((yield* fs.stat(outputPath)).type).toEqual('File');
    }).pipe(Effect.provide(ExportTestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});
