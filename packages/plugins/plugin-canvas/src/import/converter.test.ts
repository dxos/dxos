//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { MermaidEngine } from '@dxos/diagram';
import { Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { TldrawBuilder } from '@dxos/plugin-tldraw/TldrawModel';

import { CanvasLayoutBuilder, addCanvas, canvasDocument } from '#model';
import { Canvas } from '#types';

import schemaTypes from '../capabilities/schema.ts';
import { tldrawConverter } from './converter.ts';
import { frameWithChildren } from './testing.ts';

const tldraw: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.TLDRAW_SCHEMA,
  label: 'tldraw',
  builder: TldrawBuilder,
};

/** The canvas variant over the typed `Canvas`, as plugin-canvas contributes it. */
const canvas: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  canvasType: Canvas.Canvas,
  createCanvas: (input) => addCanvas(input?.diagramShapes === true ? { diagramShapes: true } : {}),
  builder: CanvasLayoutBuilder,
};

/** The hidden variant legacy scene drawings open with, which names no canvas type of its own. */
const legacy: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  hidden: true,
  builder: CanvasLayoutBuilder,
};

/** The ids of the shapes in the canvas's open layout. */
const shapeIds = (target: Canvas.Canvas): string[] =>
  Object.values(canvasDocument(target).layouts[0]?.elements ?? {})
    .flatMap((element) => (element.type === 'link' ? [] : [element.id]))
    .sort();

describe('tldrawConverter', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...schemaTypes] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const convert = (source: Drawing.Canvas, to: IllustratorCapabilities.DrawingVariant = canvas) =>
    EffectEx.runPromise(
      tldrawConverter
        .convert(source, { from: tldraw, to })
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
    if (!Canvas.isCanvas(target)) {
      throw new Error('The converter writes a scene canvas.');
    }
    expect(shapeIds(target)).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect([...upserted].sort()).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect(Object.keys(source.content).sort()).toEqual(Object.keys(content).sort());
  });

  test('writes a scene canvas for the legacy variant too, which is read only through the scene migration', async ({
    expect,
  }) => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content: frameWithChildren() }));
    const { canvas: target, upserted } = await convert(source, legacy);
    if (!Canvas.isCanvas(target)) {
      throw new Error('The converter writes a scene canvas.');
    }
    expect(shapeIds(target)).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect([...upserted].sort()).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
  });

  test('converts a drawing the scene DSL manages as every variant does, keeping its scene objects', async ({
    expect,
  }) => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA }));
    const scene = await MermaidEngine.compile('flowchart LR\n  A[Client] --> B[Server]');
    TldrawBuilder.apply(source, scene);
    const objects = TldrawBuilder.read(source).scene.objects.map(({ id }) => id);
    const { canvas: target, upserted } = await convert(source);
    expect(Canvas.isCanvas(target)).toBe(true);
    // The generic path writes the scene's objects, by their ids, rather than mapping tldraw shapes.
    expect([...upserted].sort()).toEqual([...objects].sort());
  });
});
