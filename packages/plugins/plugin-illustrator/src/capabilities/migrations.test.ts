//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';

import { Drawing, LegacySketch } from '../types';
import { sketchToDrawing } from './migrations';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const setup = async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([LegacySketch.Sketch, Drawing.Drawing, Drawing.Canvas]);
  return db;
};

/** A sketch as it exists in spaces created before the rename. */
const addLegacySketch = (db: any, { name, schema = 'tldraw.com/2' }: { name?: string; schema?: string } = {}) => {
  const canvas = db.add(Drawing.makeCanvas({ schema, content: { 'shape:1': { id: 'shape:1' } } }));
  return db.add(Obj.make(LegacySketch.Sketch, { name, canvas: Ref.make(canvas) }));
};

describe('sketch → drawing migration', () => {
  test('converts a legacy sketch in place, preserving id and canvas', async ({ expect }) => {
    const db = await setup();
    const sketch = addLegacySketch(db, { name: 'Diagram' });
    const sketchId = sketch.id;
    const canvasId = sketch.canvas.target?.id;
    await db.flush();

    await db.runMigrations([sketchToDrawing]);

    expect(await db.query(Filter.type(LegacySketch.Sketch)).run()).toHaveLength(0);
    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings).toHaveLength(1);

    const [drawing] = drawings;
    // The runtime swaps the type on the same object rather than creating a replacement, so
    // anything already referencing the sketch keeps resolving.
    expect(drawing.id).toBe(sketchId);
    expect(Obj.getTypename(drawing)).toBe('org.dxos.type.drawing');
    expect(drawing.name).toBe('Diagram');
    expect(drawing.canvas.target?.id).toBe(canvasId);
  });

  test('leaves the canvas untouched so the renderer variant still resolves', async ({ expect }) => {
    const db = await setup();
    addLegacySketch(db, { name: 'Diagram' });
    await db.flush();

    await db.runMigrations([sketchToDrawing]);

    const [drawing] = await db.query(Filter.type(Drawing.Drawing)).run();
    const canvas = drawing.canvas.target;
    invariant(canvas, 'canvas ref did not resolve after migration');
    expect(Obj.getTypename(canvas)).toBe('org.dxos.type.canvas');
    // `schema` is what matches a drawing to its variant; losing it would render "unsupported".
    expect(canvas.schema).toBe('tldraw.com/2');
    expect(canvas.content).toEqual({ 'shape:1': { id: 'shape:1' } });
  });

  test('carries a sketch with no name', async ({ expect }) => {
    const db = await setup();
    addLegacySketch(db);
    await db.flush();

    await db.runMigrations([sketchToDrawing]);

    const [drawing] = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawing.name).toBeUndefined();
  });

  test('migrates every sketch in the space', async ({ expect }) => {
    const db = await setup();
    addLegacySketch(db, { name: 'One' });
    addLegacySketch(db, { name: 'Two', schema: 'excalidraw.com/2' });
    await db.flush();

    await db.runMigrations([sketchToDrawing]);

    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings.map((drawing) => drawing.name).sort()).toEqual(['One', 'Two']);
    expect(drawings.map((drawing) => drawing.canvas.target?.schema).sort()).toEqual([
      'excalidraw.com/2',
      'tldraw.com/2',
    ]);
  });

  test('is idempotent and picks up sketches that arrive later', async ({ expect }) => {
    const db = await setup();
    addLegacySketch(db, { name: 'One' });
    await db.flush();
    await db.runMigrations([sketchToDrawing]);

    // Re-running finds nothing: a migrated object no longer matches the source type. This is what
    // makes it safe to run on every startup and on every peer.
    await db.runMigrations([sketchToDrawing]);
    expect(await db.query(Filter.type(Drawing.Drawing)).run()).toHaveLength(1);

    // A sketch replicated in from a peer that has not migrated yet is converted on the next sweep.
    addLegacySketch(db, { name: 'Two' });
    await db.flush();
    await db.runMigrations([sketchToDrawing]);

    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings.map((drawing) => drawing.name).sort()).toEqual(['One', 'Two']);
    expect(await db.query(Filter.type(LegacySketch.Sketch)).run()).toHaveLength(0);
  });
});
