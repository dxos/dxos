//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';

import { TRELLO_SOURCE } from '../constants';
import { type TrelloCard, type TrelloList } from '../services/trello-api';
import { pushBoardCards, reconcileBoardCards } from './sync-board';

/**
 * Tests the pull and push reconcilers against a real ECHO database.
 *
 * These mirror the user-visible Sync flow against a real database, no UI:
 *  - Pull adds cards on first run, idempotent on second run.
 *  - Pull soft-closes cards absent remotely.
 *  - Push creates locally-created cards in Trello + writes the foreign key back.
 *  - Push skips items pull just touched (no bouncing remote data back).
 */
describe('reconcileBoardCards (pull)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([Kanban.Kanban, Expando.Expando]);
    return { db };
  };

  const makeKanban = (db: any) =>
    db.add(
      Obj.make(Kanban.Kanban, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'board1' }] },
        name: 'Test Board',
        arrangement: { order: [], columns: {} },
        spec: { kind: 'items' as const, pivotField: 'listName', items: [] },
      }),
    );

  const makeRemoteCard = (id: string, idList: string, name: string, desc = '', closed = false): TrelloCard => ({
    id,
    name,
    desc,
    closed,
    idList,
    pos: 0,
    url: `https://trello.com/c/${id}`,
    shortUrl: `https://trello.com/c/${id}`,
    dateLastActivity: '2026-04-29T00:00:00Z',
  });

  const makeRemoteList = (id: string, name: string): TrelloList => ({
    id,
    name,
    closed: false,
    pos: 0,
  });

  test('first run adds remote cards with foreign keys', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);
    const kanban = makeKanban(db);

    const lists = [makeRemoteList('list1', 'To Do'), makeRemoteList('list2', 'Done')];
    const cards = [
      makeRemoteCard('card1', 'list1', 'Task A'),
      makeRemoteCard('card2', 'list2', 'Task B'),
    ];

    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(kanban, cards, lists);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.removed).toBe(0);
    expect(kanban.spec.kind === 'items' ? kanban.spec.items.length : 0).toBe(2);

    const items = (kanban.spec.kind === 'items' ? kanban.spec.items : [])
      .map((ref: Ref.Ref<Obj.Unknown>) => ref.target)
      .filter((o: Obj.Unknown | undefined): o is Obj.Unknown => o != null);
    const fields0 = items[0] as unknown as Record<string, unknown>;
    expect(fields0.name).toBe('Task A');
    expect(fields0.listName).toBe('To Do');
    expect(Obj.getMeta(items[0]).keys.find((k) => k.source === TRELLO_SOURCE)?.id).toBe('card1');

  });

  test('second run is idempotent (no duplicates, no new refs)', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);
    const kanban = makeKanban(db);

    const lists = [makeRemoteList('list1', 'To Do')];
    const cards = [makeRemoteCard('card1', 'list1', 'Task A')];

    const first = await Effect.gen(function* () {
      return yield* reconcileBoardCards(kanban, cards, lists);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(first.added).toBe(1);

    const second = await Effect.gen(function* () {
      return yield* reconcileBoardCards(kanban, cards, lists);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    // Idempotent: no new refs, no soft-close, no duplicate Expandos, no writes
    // (field-equality skip). `touchedByPull` still includes the card so push
    // skips it.
    expect(second.added).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.removed).toBe(0);
    expect(second.touchedByPull.size).toBe(1);
    expect(kanban.spec.kind === 'items' ? kanban.spec.items.length : 0).toBe(1);
  });

  test('soft-closes cards absent remotely', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);
    const kanban = makeKanban(db);

    const lists = [makeRemoteList('list1', 'To Do')];

    // First run: add card1 + card2.
    await Effect.gen(function* () {
      yield* reconcileBoardCards(
        kanban,
        [makeRemoteCard('card1', 'list1', 'A'), makeRemoteCard('card2', 'list1', 'B')],
        lists,
      );
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    // Second run: card2 absent remotely.
    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(kanban, [makeRemoteCard('card1', 'list1', 'A')], lists);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(result.removed).toBe(1);
    const items = (kanban.spec.kind === 'items' ? kanban.spec.items : [])
      .map((ref: Ref.Ref<Obj.Unknown>) => ref.target)
      .filter((o: Obj.Unknown | undefined): o is Obj.Unknown => o != null);
    const card2 = items.find(
      (item: Obj.Unknown) => Obj.getMeta(item).keys.find((k) => k.source === TRELLO_SOURCE)?.id === 'card2',
    );
    expect((card2 as unknown as Record<string, unknown>)?.closed).toBe(true);

  });
});

describe('pushBoardCards (push)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('creates locally-created cards remotely and writes back the foreign key', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([Kanban.Kanban, Expando.Expando]);
    const testLayer = Database.layer(db);

    // Create a local card without a foreign key (simulating user-created).
    const localCard = db.add(Obj.make(Expando.Expando, { name: 'New local', description: '', listName: 'To Do' }));
    const kanban = db.add(
      Obj.make(Kanban.Kanban, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'board1' }] },
        name: 'Test Board',
        arrangement: { order: [], columns: {} },
        spec: { kind: 'items' as const, pivotField: 'listName', items: [Ref.make(localCard)] },
      }),
    );

    const lists: TrelloList[] = [{ id: 'list1', name: 'To Do', closed: false, pos: 0 }];

    let createCalled = 0;
    const stubCreate = (_input: { listId: string; name: string; desc: string }) =>
      Effect.gen(function* () {
        createCalled++;
        return { id: 'remote-new' };
      });
    const stubUpdate = () => Effect.succeed(undefined);

    const result = await Effect.gen(function* () {
      return yield* pushBoardCards(kanban, lists, new Set(), {
        create: stubCreate,
        update: stubUpdate,
      });
    }).pipe(runAndForwardErrors);

    expect(result.created).toBe(1);
    expect(createCalled).toBe(1);
    // Foreign key should now be on the local card.
    const fk = Obj.getMeta(localCard).keys.find((k) => k.source === TRELLO_SOURCE);
    expect(fk?.id).toBe('remote-new');
  });

  test('skips items in touchedByPull set (no bouncing)', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([Kanban.Kanban, Expando.Expando]);
    const testLayer = Database.layer(db);

    const card = db.add(
      Obj.make(Expando.Expando, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'card1' }] },
        name: 'Pulled card',
        description: '',
        listName: 'To Do',
      }),
    );
    const kanban = db.add(
      Obj.make(Kanban.Kanban, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'board1' }] },
        arrangement: { order: [], columns: {} },
        spec: { kind: 'items' as const, pivotField: 'listName', items: [Ref.make(card)] },
      }),
    );

    const lists: TrelloList[] = [{ id: 'list1', name: 'To Do', closed: false, pos: 0 }];
    const touchedByPull = new Set<string>([Obj.getDXN(card).toString()]);

    let updateCalled = 0;
    const result = await Effect.gen(function* () {
      return yield* pushBoardCards(kanban, lists, touchedByPull, {
        create: () => Effect.succeed({ id: 'never' }),
        update: () => {
          updateCalled++;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(runAndForwardErrors);

    expect(result.created + result.updated).toBe(0);
    expect(updateCalled).toBe(0);
  });
});
