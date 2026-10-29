//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Annotation, Filter, Migration, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const Board = Type.makeObject(DXN.make('com.example.type.board', '0.1.0'))(
  Schema.Struct({
    format: Schema.String.pipe(
      Annotation.ContentVersionAnnotation.set({ fields: ['cards', 'title'] }),
      Schema.optional,
    ),
    cards: Schema.Record(Schema.String, Schema.Any),
    title: Schema.String.pipe(Schema.optional),
  }),
);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** 1 -> 2: a card's `text` is renamed `label`. */
const renameText = Migration.defineContent({
  type: Board,
  from: 'example.com/board/1',
  to: 'example.com/board/2',
  since: '0.1.0',
  transform: ({ cards, title }) => ({
    title,
    cards: Object.fromEntries(
      Object.entries(isRecord(cards) ? cards : {}).map(([id, card]) => {
        if (!isRecord(card) || !('text' in card)) {
          return [id, card];
        }
        const { text, ...rest } = card;
        return [id, { ...rest, label: text }];
      }),
    ),
  }),
});

/** 2 -> 3: the title is trimmed and the `draft` card is dropped. */
const trimTitle = Migration.defineContent({
  type: Board,
  from: 'example.com/board/2',
  to: 'example.com/board/3',
  since: '0.2.0',
  transform: ({ cards, title }) => {
    const { draft: _, ...rest } = isRecord(cards) ? cards : {};
    return { cards: rest, title: typeof title === 'string' ? title.trim() : title };
  },
});

test('runs a chain of content steps, writing only changed records', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([Board]);

  const board = db.add(
    Obj.make(Board, {
      format: 'example.com/board/1',
      title: '  Plan  ',
      cards: {
        a: { text: 'first' },
        b: { label: 'already current', z: 1 },
        draft: { label: 'scratch' },
      },
    }),
  );
  await db.flush();
  const heads = docHeads(board);

  await db.runMigrations([trimTitle, renameText]);

  const [migrated] = await db.query(Filter.type(Board)).run();
  expect(migrated.format).toBe('example.com/board/3');
  expect(migrated.title).toBe('Plan');
  expect(JSON.parse(JSON.stringify(migrated.cards))).toEqual({
    a: { label: 'first' },
    b: { label: 'already current', z: 1 },
  });

  // `b` was unchanged by every step, so the migration wrote nothing under it.
  expect(changedPaths(board, heads)).toEqual(new Set(['cards/a', 'cards/draft', 'format', 'title']));

  const settled = localChanges(board);
  await db.runMigrations([trimTitle, renameText]);
  expect(localChanges(board)).toEqual(settled);
});

test('leaves an object at an unknown or current version alone', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([Board]);

  const unknown = db.add(Obj.make(Board, { format: 'other.com/board/7', cards: { a: { text: 'x' } } }));
  const unversioned = db.add(Obj.make(Board, { cards: { a: { text: 'x' } } }));
  await db.flush();
  const before = [localChanges(unknown), localChanges(unversioned)];

  await db.runMigrations([renameText, trimTitle]);

  expect([localChanges(unknown), localChanges(unversioned)]).toEqual(before);
  expect(unknown.format).toBe('other.com/board/7');
  expect(JSON.parse(JSON.stringify(unknown.cards))).toEqual({ a: { text: 'x' } });
});

/** The heads of the object's document. */
const docHeads = (object: Obj.Unknown): string[] => {
  const { docHandle } = getObjectCore(object);
  invariant(docHandle, 'Object has no docHandle.');
  return A.getHeads(docHandle.doc());
};

/**
 * Hashes of the changes this client wrote to the object's document; not its heads, which also move
 * when the host writes its own root change.
 */
const localChanges = (object: Obj.Unknown): string[] => {
  const { docHandle } = getObjectCore(object);
  invariant(docHandle, 'Object has no docHandle.');
  const doc = docHandle.doc();
  const actor = A.getActorId(doc);
  return A.getAllChanges(doc)
    .map((change) => A.decodeChange(change))
    .filter((change) => change.actor === actor)
    .map((change) => change.hash)
    .filter((hash) => hash !== undefined);
};

/** The data paths, two levels deep, that changed in the object's document since `heads`. */
const changedPaths = (object: Obj.Unknown, heads: string[]): Set<string> => {
  const core = getObjectCore(object);
  invariant(core.docHandle, 'Object has no docHandle.');
  const doc = core.docHandle.doc();
  const prefix = [...core.mountPath, 'data'];
  const paths = new Set<string>();
  for (const patch of A.diff(doc, heads, A.getHeads(doc))) {
    if (prefix.every((key, index) => patch.path[index] === key)) {
      const [field, key] = patch.path.slice(prefix.length);
      paths.add(field === 'cards' && key !== undefined ? `cards/${String(key)}` : String(field));
    }
  }
  return paths;
};
