//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MermaidEngine, type Scene, SVG_SCHEMA } from '@dxos/diagram';
import { Database, Filter } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { Drawing } from '#types';

import { toSvgFile } from '../components/SceneSvgFile.tsx';
import { SvgBuilder } from './builder.ts';
import { fromDxSvg, importDxSvg, toDxSvg, toPayload } from './drawing-file.ts';

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

describe('.dx.svg', () => {
  test('a drawing exports to an SVG and imports back as an editable drawing under fresh ids', async ({ expect }) => {
    const commands = await MermaidEngine.compile(SOURCE);
    const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
    SvgBuilder.apply(canvas, commands);
    const drawing = Drawing.make({ name: 'Request path', canvas });
    const svg = toDxSvg(
      toSvgFile(objectsOf(commands)),
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
    expect(first.name).toBe('Request path');
    const imported = await first.canvas.load();
    invariant(imported, 'The imported drawing resolves its canvas.');
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

  test('a plain SVG has no payload, and importing one fails', async ({ expect }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(await EffectEx.runPromise(fromDxSvg(svg))).toBeUndefined();
    const { db } = await builder.createDatabase();
    const exit = await Effect.runPromiseExit(importDxSvg(svg).pipe(Effect.provide(Database.layer(db))));
    expect(exit._tag).toBe('Failure');
  });
});
