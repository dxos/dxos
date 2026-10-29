//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { MermaidEngine } from '@dxos/diagram';
import { Database, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { TldrawBuilder } from '@dxos/plugin-tldraw/TldrawModel';

import { CanvasBuilder, createCanvas, readViews, rootOf } from '#model';
import { Canvas } from '#types';

import { tldrawConverter } from './converter.ts';
import { frameWithChildren } from './testing.ts';

const tldraw: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.TLDRAW_SCHEMA,
  label: 'tldraw',
  builder: TldrawBuilder,
};
const canvas: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  createCanvas: (input) => Effect.succeed(createCanvas(input?.diagramShapes === true ? { diagramShapes: true } : {})),
  builder: CanvasBuilder,
};

describe('tldrawConverter', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const convert = (source: Drawing.Canvas) =>
    EffectEx.runPromise(
      tldrawConverter
        .convert(source, { from: tldraw, to: canvas })
        .pipe(
          Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
          Effect.provide(Database.layer(db)),
        ),
    );

  test('maps hand-drawn shapes shape by shape, which the scene DSL cannot carry, and leaves the source as it was', async ({
    expect,
  }) => {
    const content = frameWithChildren();
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content }));
    const { canvas: target, upserted } = await convert(source);
    expect(target.schema).toBe(Canvas.SCENE_SCHEMA);
    const views = readViews(target.content);
    const root = rootOf(target.content) ?? '';
    expect(Object.keys(views[root].nodes).sort()).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect([...upserted].sort()).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect(Object.keys(source.content).sort()).toEqual(Object.keys(content).sort());
  });

  test('converts a drawing the scene DSL manages as every variant does, keeping its scene objects', async ({
    expect,
  }) => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA }));
    const scene = await MermaidEngine.compile('flowchart LR\n  A[Client] --> B[Server]');
    TldrawBuilder.apply(source, scene);
    const objects = TldrawBuilder.read(source).scene.objects.map(({ id }) => id);
    const { canvas: target, upserted } = await convert(source);
    expect(target.schema).toBe(Canvas.SCENE_SCHEMA);
    // The generic path writes the scene's objects, by their ids, rather than mapping tldraw shapes.
    expect([...upserted].sort()).toEqual([...objects].sort());
    expect(Obj.isObject(target)).toBe(true);
  });
});
