//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Dsl, MermaidEngine, SVG_SCHEMA, SvgHandler } from '@dxos/diagram';
import { Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { SvgBuilder, bindArrowEnds, makeBuilder } from '#model';
import { Drawing, IllustratorCapabilities, IllustratorError } from '#types';

import { UnknownDrawingVariantError } from '../util/load-drawing.ts';
import convertHandler from './convert.ts';

const SOURCE = 'flowchart LR\n  A[Client] --> B[Server]';

// A stand-in for an editable renderer (plugin-excalidraw depends on this package, so it cannot be used here).
const FAKE_SCHEMA = 'example.com/editable';

const svgVariant: IllustratorCapabilities.DrawingVariant = { id: SVG_SCHEMA, label: 'svg', builder: SvgBuilder };
const editableVariant: IllustratorCapabilities.DrawingVariant = {
  id: FAKE_SCHEMA,
  label: 'Editable',
  builder: makeBuilder({ schema: FAKE_SCHEMA, handler: SvgHandler }),
};

const capabilities = (converters: readonly IllustratorCapabilities.DrawingConverter[] = []) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  for (const variant of [svgVariant, editableVariant]) {
    manager.contribute({
      interface: IllustratorCapabilities.VariantProvider,
      implementation: variant,
      module: variant.id,
    });
  }
  for (const converter of converters) {
    manager.contribute({
      interface: IllustratorCapabilities.Converter,
      implementation: converter,
      module: `${converter.from}->${converter.to}`,
    });
  }
  return manager;
};

describe('convert', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, Collection.Collection] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addSvgDrawing = async (): Promise<Drawing.Drawing> => {
    const canvas = db.add(Drawing.makeCanvas({ schema: SVG_SCHEMA }));
    SvgBuilder.apply(canvas, await MermaidEngine.compile(SOURCE));
    return db.add(Drawing.make({ name: 'Imported', canvas }));
  };

  // In place unless `copy`, as the tests below were written for; the copy tests pass it.
  const run = (
    drawing: Drawing.Drawing,
    variant: string,
    { copy = false, converters = [] }: { copy?: boolean; converters?: IllustratorCapabilities.DrawingConverter[] } = {},
  ) =>
    convertHandler
      .handler({ drawing: Ref.make(drawing), variant, ...(copy ? {} : { replace: true }) })
      .pipe(Effect.provideService(Capability.Service, capabilities(converters)), Effect.provide(Database.layer(db)));

  test('replays the scene onto a fresh canvas of the target variant and drops the old canvas', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const original = await drawing.canvas.load();
    const before = SvgBuilder.read(original).scene.objects;

    const result = await EffectEx.runPromise(run(drawing, FAKE_SCHEMA));

    const canvas = await drawing.canvas.load();
    expect(canvas.id).not.toBe(original.id);
    expect(canvas.schema).toBe(FAKE_SCHEMA);
    expect(result.scene.objects).toEqual(bindArrowEnds(before));
    expect(result.upserted).toEqual(before.map(({ id }) => id));
    expect(editableVariant.builder.read(canvas).scene.objects).toEqual(bindArrowEnds(before));
    const canvases = await db.query(Filter.type(Drawing.Canvas)).run();
    expect(canvases.map(({ id }) => id)).toEqual([canvas.id]);
  });

  test('fails on the variant the drawing already uses', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const error = await EffectEx.runPromise(Effect.flip(run(drawing, SVG_SCHEMA)));
    expect(IllustratorError.SameVariant.is(error)).toBe(true);
  });

  test('fails on an unknown variant and leaves the drawing untouched', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const canvas = drawing.canvas.target;
    const error = await EffectEx.runPromise(Effect.flip(run(drawing, 'unknown.example/1')));
    expect(error).toBeInstanceOf(UnknownDrawingVariantError);
    expect(drawing.canvas.target).toBe(canvas);
  });

  test('refuses to drop shapes drawn outside the scene and leaves the drawing untouched', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const canvas = await drawing.canvas.load();
    Obj.update(canvas, (canvas) => {
      canvas.content['hand-drawn'] = { kind: 'freehand' };
    });
    const error = await EffectEx.runPromise(Effect.flip(run(drawing, FAKE_SCHEMA)));
    expect(IllustratorError.UnmanagedShapes.is(error)).toBe(true);
    expect(drawing.canvas.target).toBe(canvas);
    const canvases = await db.query(Filter.type(Drawing.Canvas)).run();
    expect(canvases.map(({ id }) => id)).toEqual([canvas.id]);
  });

  test('keeps the old canvas while another drawing still references it', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const shared = await drawing.canvas.load();
    const other = db.add(Drawing.make({ name: 'Other', canvas: shared }));

    await EffectEx.runPromise(run(drawing, FAKE_SCHEMA));

    const converted = await drawing.canvas.load();
    expect(converted.id).not.toBe(shared.id);
    expect((await other.canvas.load()).id).toBe(shared.id);
    const canvases = await db.query(Filter.type(Drawing.Canvas)).run();
    expect(canvases.map(({ id }) => id).sort()).toEqual([shared.id, converted.id].sort());
  });

  test('binds each laid-out arrow end to the box it touches', async ({ expect }) => {
    const { commands } = await EffectEx.runPromise(
      Dsl.compile('group g {\n  node A\n  node B\n}\nnode C\nedge A -> B\nedge B -> C\n'),
    );
    const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
    const arrows = bindArrowEnds(objects).flatMap(({ elements }) =>
      elements.flatMap((element) => (element.kind === 'arrow' ? [element] : [])),
    );
    // A node inside the group frame binds to the node, not the frame around it.
    expect(arrows.map(({ from, to }) => [from, to])).toEqual([
      ['A/box', 'B/box'],
      ['B/box', 'C/box'],
    ]);
  });

  test('by default converts into a new drawing beside the source, which is left as it was', async ({ expect }) => {
    const drawing = await addSvgDrawing();
    const original = await drawing.canvas.load();
    const folder = db.add(Collection.make({ objects: [Ref.make(drawing)] }));
    await db.flush();

    const result = await EffectEx.runPromise(run(drawing, FAKE_SCHEMA, { copy: true }));
    const copy = await result.drawing.load();
    expect(copy.id).not.toBe(drawing.id);
    expect(copy.name).toBe(drawing.name);
    expect((await copy.canvas.load()).schema).toBe(FAKE_SCHEMA);
    expect((await drawing.canvas.load()).id).toBe(original.id);
    expect(folder.objects.map((ref) => ref.target?.id)).toContain(copy.id);
  });

  test("uses a converter registered for the pair over the scene replay, so a variant's own mapping wins", async ({
    expect,
  }) => {
    const drawing = await addSvgDrawing();
    const converter: IllustratorCapabilities.DrawingConverter = {
      from: SVG_SCHEMA,
      to: FAKE_SCHEMA,
      convert: () =>
        Effect.gen(function* () {
          const canvas = yield* Database.add(Drawing.makeCanvas({ schema: FAKE_SCHEMA }));
          return { canvas, upserted: ['custom'] };
        }),
    };
    const result = await EffectEx.runPromise(run(drawing, FAKE_SCHEMA, { copy: true, converters: [converter] }));
    expect(result.upserted).toEqual(['custom']);
  });
});
