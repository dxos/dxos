//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban, UNCATEGORIZED_VALUE } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { TRELLO_SOURCE } from '../constants';
import { TrelloApi } from '../services';
import { findOrCreateKanbanForBoard, pushBoardCards, reconcileBoardCards } from './sync';

type TrelloBoard = TrelloApi.TrelloBoard;
type TrelloCard = TrelloApi.TrelloCard;
type TrelloList = TrelloApi.TrelloList;

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
    await graph.schemaRegistry.register([
      AccessToken.AccessToken,
      Integration.Integration,
      Kanban.Kanban,
      Expando.Expando,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, {
        source: TRELLO_SOURCE,
        token: 'apikey:usertoken',
      }),
    );
    const integration = db.add(Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }));
    return { db, integration };
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

  const makeRemoteBoard = (id = 'board1', name = 'Test Board'): TrelloBoard => ({
    id,
    name,
    closed: false,
    url: `https://trello.com/b/${id}`,
    shortUrl: `https://trello.com/b/${id}`,
    dateLastActivity: '2026-04-29T00:00:00Z',
  });

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

  test('first run adds remote cards and seeds snapshots', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do'), makeRemoteList('list2', 'Done')];
    const cards = [makeRemoteCard('card1', 'list1', 'Task A'), makeRemoteCard('card2', 'list2', 'Task B')];

    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(integration, kanban, board, cards, lists);
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.removed).toBe(0);

    // Card snapshots seeded.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots.card1?.name).toBe('Task A');
    expect(snapshots.card1?.listName).toBe('To Do');
    expect(snapshots.card2?.name).toBe('Task B');
    // Board snapshot seeded.
    expect(snapshots.board1?.name).toBe('Test Board');
    expect(snapshots.board1?.columns?.['To Do']?.ids).toHaveLength(1);
    expect(snapshots.board1?.columns?.['Done']?.ids).toHaveLength(1);
    expect(kanban.arrangement.columns[UNCATEGORIZED_VALUE]?.hidden).toBe(true);
  });

  test('remote columns merge keeps uncategorized hidden by default', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = db.add(
      Obj.make(Kanban.Kanban, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'board1' }] },
        name: 'Test Board',
        arrangement: {
          order: [],
          columns: { [UNCATEGORIZED_VALUE]: { ids: [], hidden: false } },
        },
        spec: { kind: 'items' as const, pivotField: 'listName', items: [] },
      }),
    );

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];
    const cards = [makeRemoteCard('card1', 'list1', 'Task A')];

    await Effect.gen(function* () {
      return yield* reconcileBoardCards(integration, kanban, board, cards, lists);
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(kanban.arrangement.columns[UNCATEGORIZED_VALUE]?.hidden).toBe(false);
  });

  test('second run is idempotent (snapshot equals remote → no writes)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];
    const cards = [makeRemoteCard('card1', 'list1', 'Task A')];

    await Effect.gen(function* () {
      return yield* reconcileBoardCards(integration, kanban, board, cards, lists);
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    const second = await Effect.gen(function* () {
      return yield* reconcileBoardCards(integration, kanban, board, cards, lists);
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(second.added).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.removed).toBe(0);
    expect(kanban.spec.kind === 'items' ? kanban.spec.items.length : 0).toBe(1);
  });

  test('remote-only change pulls into local', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];

    // First sync establishes the snapshot.
    await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    // Remote rename — local untouched.
    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A renamed')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(result.updated).toBe(1);
    const item = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.target : undefined) as
      | Record<string, unknown>
      | undefined;
    expect(item?.name).toBe('Task A renamed');
  });

  test('local-only change is preserved on pull (not clobbered)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];

    // First sync.
    await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A', 'remote desc')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    // User edits the description locally.
    const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.target : undefined) as Obj.Unknown;
    Obj.change(localItem, (localItem) => {
      (localItem as unknown as Record<string, unknown>).description = 'local edit';
    });

    // Pull again with unchanged remote — local edit must survive.
    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A', 'remote desc')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(result.updated).toBe(0);
    const item = localItem as unknown as Record<string, unknown>;
    expect(item.description).toBe('local edit');
  });

  test('both-changed → remote wins (conflict policy)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];

    await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A', 'original')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.target : undefined) as Obj.Unknown;
    Obj.change(localItem, (localItem) => {
      (localItem as unknown as Record<string, unknown>).description = 'local edit';
    });

    // Remote also changed. Remote wins.
    await Effect.gen(function* () {
      return yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'Task A', 'remote edit')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    const item = localItem as unknown as Record<string, unknown>;
    expect(item.description).toBe('remote edit');
  });

  test('soft-closes cards absent remotely and updates snapshot', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);
    const kanban = makeKanban(db);

    const board = makeRemoteBoard();
    const lists = [makeRemoteList('list1', 'To Do')];

    await Effect.gen(function* () {
      yield* reconcileBoardCards(
        integration,
        kanban,
        board,
        [makeRemoteCard('card1', 'list1', 'A'), makeRemoteCard('card2', 'list1', 'B')],
        lists,
      );
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    const result = await Effect.gen(function* () {
      return yield* reconcileBoardCards(integration, kanban, board, [makeRemoteCard('card1', 'list1', 'A')], lists);
    }).pipe(Effect.provide(layer), runAndForwardErrors);

    expect(result.removed).toBe(1);
    const items = (kanban.spec.kind === 'items' ? kanban.spec.items : [])
      .map((ref: Ref.Ref<Obj.Unknown>) => ref.target)
      .filter((o: Obj.Unknown | undefined): o is Obj.Unknown => o != null);
    const card2 = items.find(
      (item: Obj.Unknown) => Obj.getMeta(item).keys.find((k) => k.source === TRELLO_SOURCE)?.id === 'card2',
    );
    expect((card2 as unknown as Record<string, unknown>)?.closed).toBe(true);
    // Snapshot's `closed` flag is updated so push won't bounce it back.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots.card2?.closed).toBe(true);
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

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([
      AccessToken.AccessToken,
      Integration.Integration,
      Kanban.Kanban,
      Expando.Expando,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, {
        source: TRELLO_SOURCE,
        token: 'apikey:usertoken',
      }),
    );
    const integration = db.add(Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }));
    return { db, integration };
  };

  test('creates locally-created cards remotely + writes back foreign key + seeds snapshot', async ({ expect }) => {
    const { db, integration } = await setup();

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
      return yield* pushBoardCards(integration, kanban, lists, {
        create: stubCreate,
        update: stubUpdate,
      });
    }).pipe(runAndForwardErrors);

    expect(result.created).toBe(1);
    expect(createCalled).toBe(1);
    const fk = Obj.getMeta(localCard).keys.find((k) => k.source === TRELLO_SOURCE);
    expect(fk?.id).toBe('remote-new');
    // Snapshot seeded for the newly-created card.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['remote-new']?.name).toBe('New local');
  });

  test('locally-edited card with foreign key → PUT only diverged fields', async ({ expect }) => {
    const { db, integration } = await setup();

    // Seed a snapshot so we can detect a local divergence on `description` only.
    Obj.change(integration, (integration) => {
      const mut = integration as Obj.Mutable<typeof integration>;
      mut.snapshots = {
        card1: { name: 'Task A', description: 'orig', listName: 'To Do', url: '', closed: false },
      };
    });

    const card = db.add(
      Obj.make(Expando.Expando, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'card1' }] },
        name: 'Task A',
        description: 'edited locally',
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

    let updatePayload: { name?: string; desc?: string; listId?: string } | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushBoardCards(integration, kanban, lists, {
        create: () => Effect.succeed({ id: 'never' }),
        update: (_id, payload) => {
          updatePayload = payload;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(runAndForwardErrors);

    expect(result.updated).toBe(1);
    expect(updatePayload).toEqual({ desc: 'edited locally' });
    // Snapshot refreshed with the pushed value so a subsequent push is a no-op.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots.card1?.description).toBe('edited locally');
  });

  test('snapshot-equal item is not pushed (no bouncing)', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.change(integration, (integration) => {
      const mut = integration as Obj.Mutable<typeof integration>;
      mut.snapshots = {
        card1: { name: 'Pulled', description: '', listName: 'To Do', url: '', closed: false },
      };
    });

    const card = db.add(
      Obj.make(Expando.Expando, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: 'card1' }] },
        name: 'Pulled',
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

    let updateCalled = 0;
    const result = await Effect.gen(function* () {
      return yield* pushBoardCards(integration, kanban, lists, {
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

describe('findOrCreateKanbanForBoard', () => {
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

  const board = (id: string, name = 'My Board'): TrelloBoard => ({
    id,
    name,
    closed: false,
    url: `https://trello.com/b/${id}`,
    shortUrl: `https://trello.com/b/${id}`,
    dateLastActivity: '2026-04-29T00:00:00Z',
  });

  test('creates a new kind:items Kanban with the foreign key on first call', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const kanban = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1', 'Board One'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(kanban.spec.kind).toBe('items');
    expect(kanban.name).toBe('Board One');
    if (kanban.spec.kind === 'items') {
      expect(kanban.spec.pivotField).toBe('listName');
      expect(kanban.spec.items).toEqual([]);
    }
    expect(Obj.getMeta(kanban).keys.find((k) => k.source === TRELLO_SOURCE)?.id).toBe('board1');
  });

  test('returns the existing Kanban on subsequent calls (idempotent)', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    const second = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(Obj.getDXN(first).toString()).toBe(Obj.getDXN(second).toString());
  });

  test('creates distinct Kanbans for distinct boards', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const a = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('boardA', 'A'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    const b = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('boardB', 'B'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(Obj.getDXN(a).toString()).not.toBe(Obj.getDXN(b).toString());
    expect(a.name).toBe('A');
    expect(b.name).toBe('B');
  });
});
