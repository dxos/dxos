//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { SvgHandler } from '@dxos/diagram';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { makeBuilder } from '#model';

import * as Drawing from './Drawing.ts';
import * as IllustratorCapabilities from './IllustratorCapabilities.ts';

/** A renderer's own canvas type, as plugin-canvas's `Canvas` is. */
class TypedCanvas extends Type.makeObject<TypedCanvas>(DXN.make('org.dxos.type.test.typedCanvas', '0.1.0'))(
  Schema.Struct({ title: Schema.optional(Schema.String) }),
) {}

const builder = makeBuilder({ schema: 'tldraw.com/2', handler: SvgHandler });

const tldraw: IllustratorCapabilities.DrawingVariant = { id: 'tldraw.com/2', label: 'tldraw', builder };
const excalidraw: IllustratorCapabilities.DrawingVariant = { id: 'excalidraw.com/2', label: 'excalidraw', builder };
const typed: IllustratorCapabilities.DrawingVariant = {
  id: 'example.com/typed',
  label: 'typed',
  canvasType: TypedCanvas,
  createCanvas: () => Effect.succeed(Obj.make(TypedCanvas, {})),
  builder,
};
const variants = [tldraw, excalidraw, typed];

describe('Drawing.canvas', () => {
  let echo: EchoTestBuilder;

  beforeEach(async () => {
    echo = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await echo.close();
  });

  test('a tldraw drawing made the current way resolves the tldraw variant', () => {
    const canvas = Drawing.makeCanvas({ schema: 'tldraw.com/2' });
    expect(IllustratorCapabilities.variantFor(canvas, variants)).toBe(tldraw);
  });

  test('a drawing whose canvas is a typed canvas resolves the variant naming that type', () => {
    const canvas = Obj.make(TypedCanvas, { title: 'Typed' });
    const drawing = Drawing.make({ name: 'Typed', canvas });
    expect(drawing.canvas.target).toBe(canvas);
    expect(IllustratorCapabilities.variantFor(canvas, variants)).toBe(typed);
  });

  test('a typed canvas no variant claims resolves none', () => {
    expect(IllustratorCapabilities.variantFor(Obj.make(TypedCanvas, {}), [tldraw, excalidraw])).toBeUndefined();
  });

  test('a query for drawings returns every kind of canvas together', async () => {
    const { db, graph } = await echo.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas, TypedCanvas]);
    db.add(Drawing.make({ name: 'tldraw', canvas: Drawing.makeCanvas({ schema: 'tldraw.com/2' }) }));
    db.add(Drawing.make({ name: 'typed', canvas: Obj.make(TypedCanvas, {}) }));
    await db.flush();
    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings.map((drawing) => drawing.name).sort()).toEqual(['tldraw', 'typed']);
  });
});
