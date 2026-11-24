//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MermaidEngine, type Scene, SVG_SCHEMA, SvgFile } from '@dxos/diagram';
import { Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';

import { Drawing } from '#types';

import { SvgBuilder } from './builder.ts';
import { fromDxSvg, importDxSvg, makeDrawing, toDxSvg, toPayload } from './drawing-file.ts';

const SOURCE = 'flowchart TB\n  A[Client] --> B[Server]\n  B --> C[(Store)]';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const placement = { origin: { x: 0, y: 0 }, scale: 1 };

/** SVG canvas content as scene revision 2 stored it: an outline switched by `border`, a component named by `type`. */
const LEGACY_CONTENT = {
  'heading/box': {
    object: 'heading',
    element: 'box',
    order: 0,
    placement,
    data: { kind: 'rect', id: 'box', x: 0, y: 0, w: 120, h: 40, text: 'Heading', border: false },
  },
  'frame/box': {
    object: 'frame',
    element: 'box',
    order: 1,
    placement,
    data: { kind: 'rect', id: 'box', x: 0, y: 60, w: 240, h: 120, color: 'light-blue', border: true },
  },
  'card/box': {
    object: 'card',
    element: 'box',
    order: 2,
    placement,
    data: { kind: 'rect', id: 'box', x: 20, y: 80, w: 96, h: 64, type: 'card', stroke: 'dashed', border: true },
  },
  'wire/arrow': {
    object: 'wire',
    element: 'arrow',
    order: 3,
    placement,
    data: { kind: 'arrow', id: 'arrow', from: 'heading/box', to: 'card/box', border: true },
  },
};

const CURRENT_ELEMENTS = [
  { kind: 'rect', id: 'box', x: 0, y: 0, w: 120, h: 40, text: 'Heading', stroke: 'none' },
  { kind: 'rect', id: 'box', x: 0, y: 60, w: 240, h: 120, color: 'light-blue', stroke: 'solid' },
  { kind: 'rect', id: 'box', x: 20, y: 80, w: 96, h: 64, stroke: 'dashed', component: 'card' },
  { kind: 'arrow', id: 'arrow', from: 'heading/box', to: 'card/box' },
];

const elementsOf = (canvas: Drawing.Canvas) =>
  SvgBuilder.read(canvas).scene.objects.flatMap(({ elements }) => elements);

describe('.dx.svg', () => {
  test('a drawing exports to an SVG and imports back as an editable drawing under fresh ids', async ({ expect }) => {
    const commands = await MermaidEngine.compile(SOURCE);
    const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
    SvgBuilder.apply(canvas, commands);
    const drawing = Drawing.make({ name: 'Request path', canvas });
    const svg = toDxSvg(
      SvgFile.toSvgFile(objectsOf(commands)),
      toPayload({ drawing, canvas, source: { language: 'mermaid', text: SOURCE } }),
    );

    // Still a picture: the scene is drawn, and the payload names the source it came from.
    expect(svg).toMatch(/^<!--[^>]*-->\n<svg /);
    expect(svg).toContain('Client');
    const payload = await EffectEx.runPromise(fromDxSvg(svg));
    expect(payload?.root).toBe(drawing.id);
    expect(payload?.source?.text).toBe(SOURCE);

    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const importTwice = Effect.all([importDxSvg(svg), importDxSvg(svg)]).pipe(Effect.provide(Database.layer(db)));
    const [first, second] = await EffectEx.runPromise(importTwice);

    expect(first.id).not.toBe(drawing.id);
    expect(second.id).not.toBe(first.id);
    expect(await db.query(Filter.type(Drawing.Drawing)).run()).toHaveLength(2);
    // The drawing returned is the database's own, so an edit to it (a conversion re-pointing its canvas) persists.
    expect(await db.query(Filter.id(first.id)).first()).toBe(first);
    expect(first.name).toBe('Request path');
    const imported = await first.canvas.load();
    invariant(Drawing.isCanvas(imported), 'The imported drawing resolves its canvas.');
    expect(imported.id).not.toBe(canvas.id);
    expect(imported.schema).toBe(SVG_SCHEMA);
    expect(
      SvgBuilder.read(imported)
        .scene.objects.map(({ id }) => id)
        .sort(),
    ).toEqual(
      SvgBuilder.read(canvas)
        .scene.objects.map(({ id }) => id)
        .sort(),
    );
  });

  test('rendering the same diagram twice gives the same bytes, and the file still imports', async ({ expect }) => {
    const render = async () => {
      const commands = await MermaidEngine.compile(SOURCE);
      const source = { language: 'mermaid' as const, text: SOURCE };
      const { drawing, canvas } = makeDrawing({ name: 'Request path', commands, source });
      return toDxSvg(SvgFile.toSvgFile(objectsOf(commands)), toPayload({ drawing, canvas, source }));
    };
    const [first, second] = [await render(), await render()];
    expect(second).toBe(first);
    expect(first).not.toContain('timestamp');

    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const drawing = await EffectEx.runPromise(importDxSvg(first).pipe(Effect.provide(Database.layer(db))));
    expect(drawing.name).toBe('Request path');
    const canvas = await drawing.canvas.load();
    invariant(canvas, 'The imported drawing resolves its canvas.');
    expect(SvgBuilder.read(canvas).scene.objects.length).toBeGreaterThan(0);
  });

  test('a payload whose root is not a drawing imports nothing', async ({ expect }) => {
    const commands = await MermaidEngine.compile(SOURCE);
    const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
    SvgBuilder.apply(canvas, commands);
    const drawing = Drawing.make({ name: 'Request path', canvas });
    const svg = toDxSvg(SvgFile.toSvgFile(objectsOf(commands)), { ...toPayload({ drawing, canvas }), root: canvas.id });

    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const exit = await Effect.runPromiseExit(importDxSvg(svg).pipe(Effect.provide(Database.layer(db))));
    expect(exit._tag).toBe('Failure');
    expect(await db.query(Filter.type(Drawing.Canvas)).run()).toHaveLength(0);
  });

  test('a file written in the earlier words imports with its elements in the current words', async ({ expect }) => {
    const canvas = Obj.make(Drawing.Canvas, { schema: SVG_SCHEMA, content: LEGACY_CONTENT });
    const drawing = Drawing.make({ name: 'Slide', canvas });
    const svg = toDxSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"></svg>',
      toPayload({ drawing, canvas }),
    );
    expect(svg).toContain('"border":false');
    expect(svg).toContain('"type":"card"');

    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const imported = await EffectEx.runPromise(importDxSvg(svg).pipe(Effect.provide(Database.layer(db))));
    const stored = await imported.canvas.load();
    invariant(Drawing.isCanvas(stored), 'The imported drawing resolves its canvas.');
    // What the space now stores is current, so no later reader has to know the old words.
    const records = Object.values(stored.content).sort((left, right) => left.order - right.order);
    expect(records.map(({ data }) => ({ ...data }))).toEqual(CURRENT_ELEMENTS);
    expect(elementsOf(stored)).toEqual(CURRENT_ELEMENTS);
  });

  test('a canvas a space stored in the earlier words reads in the current words', ({ expect }) => {
    const canvas = Obj.make(Drawing.Canvas, { schema: SVG_SCHEMA, content: LEGACY_CONTENT });
    expect(elementsOf(canvas)).toEqual(CURRENT_ELEMENTS);
    // Editing one object leaves the others stored as they were, and they still read current.
    SvgBuilder.apply(canvas, [{ op: 'move-object', objectId: 'card', origin: { x: 8, y: 8 } }]);
    expect(elementsOf(canvas)).toEqual(CURRENT_ELEMENTS);
  });

  test('a plain SVG has no payload, and importing one fails', async ({ expect }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(await EffectEx.runPromise(fromDxSvg(svg))).toBeUndefined();
    const { db } = await builder.createDatabase();
    const exit = await Effect.runPromiseExit(importDxSvg(svg).pipe(Effect.provide(Database.layer(db))));
    expect(exit._tag).toBe('Failure');
  });
});
