//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { createBoardStore } from '../scene/index.ts';
import { createTrigger } from '../shapes/index.ts';
import { CanvasBoard } from './index.ts';

/**
 * A board exactly as the legacy canvas editor persisted it (`Obj.toJSON` of its `CanvasBoard`): a compute
 * shape and a note, joined by one connection with both property names. The literal is the compatibility contract,
 * so it is never regenerated from the schema under test.
 */
const persistedBoard = {
  'id': '01M4ESMZRC98J310RDFN2TTAFT',
  '@type': 'dxn:org.dxos.type.canvasBoard:0.1.0',
  '@meta': { keys: [] },
  'name': 'Circuit',
  'layout': {
    nodes: [
      {
        id: 'switch-1',
        type: 'switch',
        node: 'compute-1',
        center: { x: -128, y: 0 },
        size: { width: 64, height: 64 },
      },
      {
        id: 'note-1',
        type: 'note',
        text: 'Hello',
        center: { x: 0, y: -128 },
        size: { width: 256, height: 128 },
      },
    ],
    edges: [{ id: 'edge-1', source: 'switch-1', target: 'note-1', output: 'value', input: 'input' }],
  },
};

const { id, '@type': _type, '@meta': _meta, ...fields } = persistedBoard;

/** The persisted board stored in a database and read back through a query for the compute type. */
const loadBoard = Effect.gen(function* () {
  yield* Database.add(Obj.make(CanvasBoard.CanvasBoard, { id, ...fields }));
  yield* Database.flush();
  return yield* Database.query(Filter.type(CanvasBoard.CanvasBoard)).run;
}).pipe(Effect.provide(TestDatabaseLayer({ types: [CanvasBoard.CanvasBoard] })), Effect.scoped);

const TRIGGER_NODE = '01M4ESMZRC98J310RDFN2TTAFA';

/**
 * A board holding a trigger as the legacy editor stored one, its compute node and its function trigger reference
 * beside the shape's own fields, and a note to edit.
 */
const loadTriggerBoard = Effect.gen(function* () {
  const { data, ...shape } = createTrigger({ id: 'trigger-1', center: { x: 0, y: 0 } });
  const functionTrigger = data?.functionTrigger;
  const target = functionTrigger?.peek();
  if (target) {
    yield* Database.add(target);
  }
  const [, note] = persistedBoard.layout.nodes;
  yield* Database.add(
    CanvasBoard.make({ layout: { nodes: [{ ...shape, node: TRIGGER_NODE, functionTrigger }, note], edges: [] } }),
  );
  yield* Database.flush();
  const [board] = yield* Database.query(Filter.type(CanvasBoard.CanvasBoard)).run;
  return { board, uri: functionTrigger?.uri };
}).pipe(Effect.provide(TestDatabaseLayer({ types: [CanvasBoard.CanvasBoard, Trigger.Trigger] })), Effect.scoped);

describe('CanvasBoard', () => {
  test('keeps the typename and version boards were saved under', ({ expect }) => {
    expect(Type.getTypename(CanvasBoard.CanvasBoard)).toBe('org.dxos.type.canvasBoard');
    expect(Type.getVersion(CanvasBoard.CanvasBoard)).toBe('0.1.0');
  });

  test('a board as the editor saved it round-trips through a database unchanged', async ({ expect }) => {
    const boards = await EffectEx.runPromise(loadBoard);
    expect(boards).toHaveLength(1);
    const [board] = boards;
    expect(Obj.instanceOf(CanvasBoard.CanvasBoard, board)).toBe(true);
    // `@uri` names the test space, so it is the one key the editor's JSON cannot carry.
    const { '@uri': _uri, ...json } = Obj.toJSON(board);
    expect(json).toEqual(persistedBoard);
  });

  test('the board store reads the persisted layout as a 2D layout', async ({ expect }) => {
    const [board] = await EffectEx.runPromise(loadBoard);
    const layout = createBoardStore(board).read();
    expect(layout).toMatchObject({ id: board.id, dim: '2d', name: 'Circuit' });
    expect(Object.keys(layout.elements)).toEqual(['switch-1', 'note-1', 'edge-1']);
    expect(layout.elements['note-1']).toMatchObject({ type: 'note', text: 'Hello', center: { x: 0, y: -128 } });
    // The editor stored the compute node beside the shape's own fields; it reads under the element's data.
    expect(layout.elements['switch-1']).toMatchObject({ type: 'switch', data: { node: 'compute-1' } });
    expect('node' in layout.elements['switch-1']).toBe(false);
    expect(layout.elements['edge-1']).toMatchObject({
      source: { node: 'switch-1', port: 'output.value' },
      target: { node: 'note-1', port: 'input.input' },
    });
  });

  test('a shape created through the board store is written to the stored board', async ({ expect }) => {
    const [board] = await EffectEx.runPromise(loadBoard);
    const store = createBoardStore(board);
    store.write({
      kind: 'create',
      element: {
        id: 'rect-1',
        type: 'rect',
        z: 'z',
        center: { x: 256, y: 0 },
        size: { width: 128, height: 64 },
        label: 'Added',
      },
    });
    expect(board.layout.nodes.map((node) => node.id)).toEqual(['switch-1', 'note-1', 'rect-1']);
    expect(board.layout.nodes[2]).toMatchObject({ type: 'rect', size: { width: 128, height: 64 }, label: 'Added' });
    // The stored connection is untouched by a write that does not change it.
    expect(board.layout.edges[0]).toEqual(persistedBoard.layout.edges[0]);
  });

  test("a write stores a persisted shape's compute node under its data, and no longer beside its fields", async ({
    expect,
  }) => {
    const [board] = await EffectEx.runPromise(loadBoard);
    const store = createBoardStore(board);
    store.write({ kind: 'move', ids: ['note-1'], delta: { x: 32, y: 0 } });
    const [{ node: _node, ...shape }, note] = persistedBoard.layout.nodes;
    expect(Obj.getSnapshot(board).layout.nodes).toEqual([
      { ...shape, data: { node: 'compute-1' } },
      { ...note, center: { x: 32, y: -128 } },
    ]);
    expect(store.read().elements['switch-1']).toMatchObject({ type: 'switch', data: { node: 'compute-1' } });
  });

  test("a write moves a persisted trigger's function trigger under its data, still a reference", async ({ expect }) => {
    const { board, uri } = await EffectEx.runPromise(loadTriggerBoard);
    const stored = () => board.layout.nodes.find((shape) => shape.id === 'trigger-1');
    expect(Ref.isRef(stored()?.functionTrigger)).toBe(true);
    createBoardStore(board).write({ kind: 'move', ids: ['note-1'], delta: { x: 32, y: 0 } });
    const shape = stored();
    expect(Object.keys(shape ?? {}).sort()).toEqual(['center', 'data', 'id', 'size', 'type']);
    expect(shape?.data.node).toBe(TRIGGER_NODE);
    expect(Ref.isRef(shape?.data.functionTrigger)).toBe(true);
    expect(uri).toBeDefined();
    expect(shape?.data.functionTrigger.uri).toBe(uri);
  });
});
