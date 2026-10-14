//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';
import { describe, test } from 'vitest';

import { spaceLayer } from '@dxos/cli-util';
import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { DxSvg } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Drawing } from '#types';

import { handler as exportDrawing } from './export.ts';
import { handler as importDrawing } from './import.ts';
import { handler as list } from './list.ts';
import { handler as render } from './render.ts';

const SOURCE = `
node CLI "dx drawing"
node Engine "SemanticEngine" below CLI
node Space "ECHO space" right-of Engine
edge CLI -> Engine "render"
edge Engine -> Space "import"
`;

const CommandTestLayer = Layer.mergeAll(TestLayer, NodeServices.layer);

const lastOutput = Effect.fn(function* <T>() {
  const { logs } = yield* TestConsole.TestConsole;
  return TestConsole.parseJson<T>(logs[logs.length - 1]);
});

/** A `.dx` source in a scoped temp directory, rendered to a `.dx.svg` beside it. */
const renderFixture = Effect.fn(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* fs.makeTempDirectoryScoped();
  const file = path.join(dir, 'pipeline.dx');
  yield* fs.writeFileString(file, SOURCE);
  yield* render({ file, out: Option.none(), plain: false });
  return { dir, report: yield* lastOutput<{ file: string; nodes: number; crossings: number }>() };
});

describe('dx drawing', () => {
  test('render lays out a .dx file into a .dx.svg carrying the drawing and its source', async ({ expect }) => {
    await Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { report } = yield* renderFixture();
      expect(report.file.endsWith('pipeline.dx.svg')).toBe(true);
      expect(report.nodes).toBe(3);
      expect(report.crossings).toBe(0);

      const svg = yield* fs.readFileString(report.file);
      expect(svg).toMatch(/<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(svg).toContain('SemanticEngine');
      expect(DxSvg.extract(svg)).toMatchObject({ source: { language: 'dsl', text: SOURCE } });
    }).pipe(Effect.provide(CommandTestLayer), Effect.scoped, EffectEx.runPromise);
  });

  test('a rendered .dx.svg imports into a space, lists, and exports back to the same picture', async ({ expect }) => {
    await Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const client = yield* ClientService;
      yield* Effect.promise(() => client.addTypes([Drawing.Drawing, Drawing.Canvas]));
      yield* Effect.promise(() => client.halo.createIdentity());
      const space = yield* Effect.promise(() => client.spaces.create());
      yield* Effect.promise(() => space.waitUntilReady());
      const inSpace = Effect.provide(spaceLayer(Option.some(space.id)));

      const { dir, report } = yield* renderFixture();
      yield* importDrawing({ file: report.file }).pipe(inSpace);
      const imported = yield* lastOutput<{ id: string; name: string }>();
      expect(imported.name).toBe('pipeline');

      yield* list().pipe(inSpace);
      expect(yield* lastOutput<{ id: string }[]>()).toEqual([{ id: imported.id, name: 'pipeline' }]);

      const out = path.join(dir, 'roundtrip.dx.svg');
      yield* exportDrawing({ id: imported.id, out: Option.some(out) }).pipe(inSpace);
      const exported = yield* fs.readFileString(out);
      expect(DxSvg.extract(exported)).toMatchObject({ root: imported.id, objects: expect.any(Array) });
      const picture = (svg: string) => svg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
      expect(picture(exported)).toEqual(picture(yield* fs.readFileString(report.file)));
    }).pipe(Effect.provide(CommandTestLayer), Effect.scoped, EffectEx.runPromise);
  });
});
