//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Dsl, MermaidEngine } from '@dxos/diagram';
import { Database, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import { TldrawBuilder } from '@dxos/plugin-tldraw/TldrawModel';
import { Scene } from '@dxos/scene';

import { Canvas } from '#types';

import types from '../capabilities/schema.ts';
import { tldrawConverter } from '../import/converter.ts';
import { frameWithChildren, groupAndRotation } from '../import/testing.ts';
import { LegacyCanvasBuilder, makeLegacyCanvas } from '../testing/legacy-drawing.ts';
import { CanvasLayoutBuilder, readCanvasContent } from './canvas-content.ts';
import { addCanvas, openScene } from './canvas-document.ts';
import { readViews } from './content.ts';
import { makeLayoutWriter } from './layout-writer.ts';

const FLOW = 'flowchart LR\n  A[Client] --> B[Server]';

const tldraw: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.TLDRAW_SCHEMA,
  label: 'tldraw',
  builder: TldrawBuilder,
};

/** The canvas variant over the typed `Canvas`, as plugin-canvas contributes it. */
const canvasVariant: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  canvasType: Canvas.Canvas,
  createCanvas: (input) => addCanvas(input?.diagramShapes === true ? { diagramShapes: true } : {}),
  builder: CanvasLayoutBuilder,
};

describe('CanvasLayoutBuilder', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...types] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const run = <A>(effect: Effect.Effect<A, Error, Database.Service | Capability.Service>) =>
    EffectEx.runPromise(
      effect.pipe(
        Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
        Effect.provide(Database.layer(db)),
      ),
    );

  const layoutOf = (canvas: Obj.Unknown): Scene.Layout2D => {
    const layout = Canvas.isCanvas(canvas) ? openScene(canvas)?.layout.target : undefined;
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      throw new Error('A canvas opens a 2D layout.');
    }
    return layout;
  };

  test('applies the scene DSL to the open layout and reads back the objects the legacy canvas holds', async () => {
    const scene = await MermaidEngine.compile(FLOW);
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, scene);
    const legacy = db.add(makeLegacyCanvas());
    LegacyCanvasBuilder.apply(legacy, scene);
    expect(CanvasLayoutBuilder.read(canvas).scene.objects).toEqual(LegacyCanvasBuilder.read(legacy).scene.objects);
    const layout = layoutOf(canvas);
    expect(
      Object.values(layout.elements).some(
        (element) => element.dsl?.object !== undefined && element.props?.dsl === undefined,
      ),
    ).toBe(true);
  });

  test("an edit written without the DSL's identities keeps each element's typed dsl field", async () => {
    const scene = await MermaidEngine.compile(FLOW);
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, scene);
    const layout = layoutOf(canvas);
    const [id, element] =
      Object.entries(layout.elements).find(([, element]) => element.dsl !== undefined && element.center) ?? [];
    const identity = element?.dsl && { ...element.dsl };
    expect(id && identity).toBeTruthy();
    const opened = openScene(canvas);
    if (!id || !Obj.instanceOf(Scene.Scene2D, opened)) {
      throw new Error('A canvas opens a 2D scene.');
    }
    const views = readViews(readCanvasContent(canvas));
    const view = Object.values(views).find((view) => id in view.nodes);
    const node = view?.nodes[id];
    if (!view || !node) {
      throw new Error('The element reads back as a node.');
    }
    const moved = {
      ...view,
      nodes: { ...view.nodes, [id]: { ...node, center: { x: node.center.x + 64, y: node.center.y } } },
    };
    makeLayoutWriter(opened).write({ ...views, [view.id]: moved }, views);
    expect(layout.elements[id].center?.x).toBe(node.center.x + 64);
    expect({ ...layout.elements[id].dsl }).toEqual(identity);
  });

  test("the Draw path: semantic .dx compiles onto the canvas's Layout2D, and recompiling an edit updates those elements", async () => {
    const source = 'diagram flow=right\nnode A "Alpha"\nnode B "Beta"\nedge A -> B "calls"';
    const first = await EffectEx.runPromise(Dsl.compile(source));
    expect(first.problems.filter(({ severity }) => severity === 'error')).toEqual([]);
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, first.commands);
    const layout = layoutOf(canvas);
    const managed = () => Object.values(layout.elements).filter((element) => element.dsl !== undefined);
    const ids = managed()
      .map((element) => element.id)
      .sort();
    expect(managed().map((element) => element.dsl?.object)).toEqual(expect.arrayContaining(['A', 'B']));
    const second = await EffectEx.runPromise(Dsl.compile(source.replace('"Beta"', '"Gamma"')));
    CanvasLayoutBuilder.apply(canvas, second.commands);
    expect(
      managed()
        .map((element) => element.id)
        .sort(),
    ).toEqual(ids);
    expect(Object.values(layout.elements).some((element) => element.label === 'Gamma')).toBe(true);
    expect(Object.values(layout.elements).some((element) => element.label === 'Beta')).toBe(false);
  });

  test('a second apply updates the elements it manages rather than adding more', async () => {
    const scene = await MermaidEngine.compile(FLOW);
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, scene);
    const count = Object.keys(layoutOf(canvas).elements).length;
    CanvasLayoutBuilder.apply(canvas, scene);
    expect(Object.keys(layoutOf(canvas).elements)).toHaveLength(count);
  });

  test('tldraw hand-drawn shapes convert into the layout of a typed canvas', async () => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content: frameWithChildren() }));
    const { canvas, upserted } = await run(tldrawConverter.convert(source, { from: tldraw, to: canvasVariant }));
    expect(Canvas.isCanvas(canvas)).toBe(true);
    const nodes = Object.values(layoutOf(canvas).elements).filter((element) => element.type !== 'link');
    expect(nodes.map((element) => element.id).sort()).toEqual([...upserted].sort());
    // The frames sit on their own layer under the content, as the import maps them.
    expect(layoutOf(canvas).layers?.frames).toBeDefined();
  });

  test('a tldraw group converts into a composite layout of the typed canvas, placed by an object of its model', async () => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content: groupAndRotation() }));
    const { canvas } = await run(tldrawConverter.convert(source, { from: tldraw, to: canvasVariant }));
    if (!Canvas.isCanvas(canvas)) {
      throw new Error('The converter writes a typed canvas.');
    }
    const parts = canvas.layouts
      .map((ref) => ref.target)
      .find((target) => Obj.instanceOf(Scene.Layout2D, target) && target.key === 'group-object');
    expect(Obj.instanceOf(Scene.Layout2D, parts) && Object.keys(parts.elements).sort()).toEqual(
      expect.arrayContaining(['member', 'partner', 'pair']),
    );
    const model = layoutOf(canvas).model?.target;
    expect(Obj.instanceOf(Scene.Model2D, model) && model.objects['instance:group-object']?.parts?.target).toBe(parts);
    expect(layoutOf(canvas).elements.group).toMatchObject({ object: 'instance:group-object' });
    expect(layoutOf(canvas).elements.tie).toMatchObject({ target: { node: 'group' } });
  });

  test('a laid-out tldraw drawing converts to a canvas, and the canvas back to tldraw', async () => {
    const source = db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA }));
    TldrawBuilder.apply(source, await MermaidEngine.compile(FLOW));
    const objects = TldrawBuilder.read(source)
      .scene.objects.map(({ id }) => id)
      .sort();

    const { canvas } = await run(tldrawConverter.convert(source, { from: tldraw, to: canvasVariant }));
    expect(
      CanvasLayoutBuilder.read(canvas)
        .scene.objects.map(({ id }) => id)
        .sort(),
    ).toEqual(objects);

    const back = await run(IllustratorModel.convertByScene(canvas, { from: canvasVariant, to: tldraw }));
    expect(
      TldrawBuilder.read(back.canvas)
        .scene.objects.map(({ id }) => id)
        .sort(),
    ).toEqual(objects);
  });
});
