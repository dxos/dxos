//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { createEchoStore } from '../scene/index.ts';
import { CanvasBoard } from './index.ts';

/**
 * A board exactly as `@dxos/react-ui-canvas-editor` persisted it (`Obj.toJSON` of its `CanvasBoard`): a compute
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

  test('the echo store reads the persisted layout as a scene', async ({ expect }) => {
    const [board] = await EffectEx.runPromise(loadBoard);
    const store = createEchoStore(board);
    const scene = Registry.make().get(store.scene(board.id));
    expect(scene?.name).toBe('Circuit');
    expect(Object.keys(scene?.nodes ?? {})).toEqual(['switch-1', 'note-1']);
    expect(scene?.nodes['note-1']).toMatchObject({ type: 'note', text: 'Hello', center: { x: 0, y: -128 } });
    expect(scene?.links['edge-1']).toMatchObject({
      source: { node: 'switch-1', port: 'output.value' },
      target: { node: 'note-1', port: 'input.input' },
    });
  });
});
