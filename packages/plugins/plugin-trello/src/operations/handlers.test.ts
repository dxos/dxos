//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { InternalError } from '@dxos/errors';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { Kanban } from '@dxos/plugin-kanban';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { TRELLO_SOURCE } from '../constants';
import { TrelloApi } from '../services';
import getTrelloBoardsHandler from './get-trello-boards';
import materializeTrelloTargetHandler from './materialize-target';
import syncTrelloBoardHandler from './sync';

type TrelloBoard = TrelloApi.TrelloBoard;
type TrelloCard = TrelloApi.TrelloCard;
type TrelloList = TrelloApi.TrelloList;

// Stub the network layer so handlers run against fixtures, not real Trello.
vi.mock('../services/trello-api', async () => {
  const actual = await vi.importActual<typeof import('../services/trello-api')>('../services/trello-api');
  const boards: TrelloBoard[] = [
    {
      id: 'board-a',
      name: 'Board A',
      closed: false,
      url: 'https://trello.com/b/board-a',
      shortUrl: 'https://trello.com/b/A',
      dateLastActivity: '2026-04-29T00:00:00Z',
    },
    {
      id: 'board-b',
      name: 'Board B',
      closed: false,
      url: 'https://trello.com/b/board-b',
      shortUrl: 'https://trello.com/b/B',
      dateLastActivity: '2026-04-29T00:00:00Z',
    },
  ];
  const lists: Record<string, TrelloList[]> = {
    'board-a': [{ id: 'list-a1', name: 'To Do', closed: false, pos: 0 }],
    'board-b': [{ id: 'list-b1', name: 'Doing', closed: false, pos: 0 }],
  };
  const cards: Record<string, TrelloCard[]> = {
    'board-a': [
      {
        id: 'card-a1',
        name: 'Task A1',
        desc: 'desc',
        closed: false,
        idList: 'list-a1',
        pos: 0,
        url: '',
        shortUrl: '',
        dateLastActivity: '2026-04-29T00:00:00Z',
      },
    ],
    'board-b': [
      {
        id: 'card-b1',
        name: 'Task B1',
        desc: 'desc',
        closed: false,
        idList: 'list-b1',
        pos: 0,
        url: '',
        shortUrl: '',
        dateLastActivity: '2026-04-29T00:00:00Z',
      },
    ],
  };
  return {
    ...actual,
    // Real `trello-api` functions return `Effect<T, HttpClientError | ParseError, HttpClient>`.
    // The stubs return `Effect.succeed(...)` so handlers can `yield*` them
    // without needing a real HttpClient layer.
    fetchMember: vi.fn(() =>
      Effect.succeed({
        id: 'me',
        username: 'me',
        fullName: 'Me',
        email: 'me@example.com',
      }),
    ),
    fetchBoards: vi.fn(() => Effect.succeed(boards)),
    fetchLists: vi.fn((boardId: string) => Effect.succeed(lists[boardId] ?? [])),
    fetchCards: vi.fn((boardId: string) => Effect.succeed(cards[boardId] ?? [])),
    createCard: vi.fn(() =>
      Effect.succeed({
        id: 'remote-new',
        name: '',
        desc: '',
        closed: false,
        idList: '',
        pos: 0,
        url: '',
        shortUrl: '',
        dateLastActivity: '',
      }),
    ),
    updateCard: vi.fn(() =>
      Effect.succeed({
        id: '',
        name: '',
        desc: '',
        closed: false,
        idList: '',
        pos: 0,
        url: '',
        shortUrl: '',
        dateLastActivity: '',
      }),
    ),
  };
});

/**
 * Stub `Operation.Service` for tests that bypass the OperationInvoker.
 *
 * In production the invoker provides this service to handlers; here we call
 * handlers directly, so we provide a no-op service so any nested
 * `Operation.invoke` call (e.g. the toast emission inside `SyncTrelloBoard`)
 * succeeds silently. The handler under test isn't asserting anything about
 * the toast; the toast is UX-only.
 */
const stubOperationService = Effect.provideService(Operation.Service, {
  invoke: () => Effect.succeed(undefined as any),
  schedule: () => Effect.succeed(undefined),
  invokePromise: () => Promise.resolve({ data: undefined as any }),
});

/**
 * Light end-to-end stitching:
 *  - `GetTrelloBoards` returns descriptors only — read-only, no local Kanbans.
 *  - Selecting a board materializes an empty local Kanban (`materializeTarget`)
 *    and creates a `SyncBinding` from the connection to that Kanban.
 *  - `SyncTrelloBoard` reconciles the bound board's cards. Unselected boards
 *    leave no trace.
 */
describe('Trello operation handlers (e2e with stubbed API)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      AccessToken.AccessToken,
      Connection.Connection,
      SyncBinding.SyncBinding,
      Kanban.Kanban,
      Expando.Expando,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, {
        source: TRELLO_SOURCE,
        token: 'apikey:usertoken',
        account: 'me@example.com',
      }),
    );
    const connection = db.add(Connection.make({ connectorId: 'trello', accessToken: Ref.make(token) }));
    return { db, connection };
  };

  /** Materializes a Kanban for `remoteTarget` and binds it; returns the binding. */
  const bindTarget = (
    db: Database.Database,
    connection: Connection.Connection,
    remoteTarget: { id: string; name: string },
  ) =>
    Effect.gen(function* () {
      const { target } = yield* materializeTrelloTargetHandler.handler({
        connection: Ref.make(connection),
        remoteTarget,
      });
      const kanban = yield* Database.load(target);
      return yield* Database.add(
        SyncBinding.make({
          [Relation.Source]: connection,
          [Relation.Target]: kanban,
          remoteId: remoteTarget.id,
          name: remoteTarget.name,
        }),
      );
    }).pipe(Effect.provide(Database.layer(db)), Effect.provide(FetchHttpClient.layer));

  test('full flow: GetTrelloBoards (discovery) → bind selection → SyncTrelloBoard syncs only chosen boards', async ({
    expect,
  }) => {
    const { db, connection } = await setup();
    const layer = Database.layer(db);

    // 1. Discovery: descriptors only — NO local Kanbans created yet.
    const discovered = await getTrelloBoardsHandler
      .handler({ connection: Ref.make(connection) })
      .pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);
    expect(discovered.targets).toHaveLength(2);
    const boardA = discovered.targets.find((t) => t.id === 'board-a')!;
    expect(boardA.name).toBe('Board A');

    const kanbansAfterDiscovery = await db.query(Filter.type(Kanban.Kanban)).run();
    expect(kanbansAfterDiscovery).toHaveLength(0);

    // 2. Selection: materialize board A's Kanban + create the binding. The
    // coordinator's `setSyncBindings` does this in production; here we exercise
    // the connector's `materializeTarget` directly.
    const binding = await bindTarget(db, connection, { id: boardA.id, name: boardA.name }).pipe(
      EffectEx.runAndForwardErrors,
    );

    // Materialization created exactly board A's (empty) Kanban; board B was never selected.
    const kanbansAfterBind = await db.query(Filter.type(Kanban.Kanban)).run();
    expect(kanbansAfterBind).toHaveLength(1);
    expect(binding.snapshots).toBeUndefined();

    // 3. Sync: reconciles the bound board's cards.
    const result = await syncTrelloBoardHandler
      .handler({ binding: Ref.make(binding) })
      .pipe(stubOperationService, Effect.provide(layer), EffectEx.runAndForwardErrors);
    expect(result.pulled.added).toBe(1);

    // Board A's Kanban now carries its single card.
    const boardAKanban = Relation.getTarget(binding);
    expect(Obj.instanceOf(Kanban.Kanban, boardAKanban)).toBe(true);
    expect(Obj.getMeta(boardAKanban).keys.find((key) => key.source === TRELLO_SOURCE)?.id).toBe('board-a');
    if (Obj.instanceOf(Kanban.Kanban, boardAKanban)) {
      expect(boardAKanban.spec.kind === 'items' ? boardAKanban.spec.items.length : -1).toBe(1);
    }

    // Sync stamped success on the binding.
    expect(binding.lastSyncAt).toBeDefined();
    expect(binding.lastError).toBeUndefined();
  });

  test('failing fetch on a board writes lastError on its binding', async ({ expect }) => {
    const trelloApi = await import('../services/trello-api');
    // Make fetchLists fail for board-b only.
    const fetchLists = trelloApi.fetchLists as unknown as ReturnType<typeof vi.fn>;
    fetchLists.mockImplementation((boardId: string) => {
      if (boardId === 'board-b') {
        return Effect.fail(new InternalError({ context: { reason: 'boom' } }));
      }
      return Effect.succeed([{ id: 'list-a1', name: 'To Do', closed: false, pos: 0 }]);
    });

    const { db, connection } = await setup();
    const layer = Database.layer(db);

    const discovered = await getTrelloBoardsHandler
      .handler({ connection: Ref.make(connection) })
      .pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    // Bind both boards.
    const bindingA = await bindTarget(db, connection, { id: 'board-a', name: 'Board A' }).pipe(
      EffectEx.runAndForwardErrors,
    );
    const bindingB = await bindTarget(db, connection, { id: 'board-b', name: 'Board B' }).pipe(
      EffectEx.runAndForwardErrors,
    );
    expect(discovered.targets).toHaveLength(2);

    // Board A syncs cleanly.
    await syncTrelloBoardHandler
      .handler({ binding: Ref.make(bindingA) })
      .pipe(stubOperationService, Effect.provide(layer), EffectEx.runAndForwardErrors);
    expect(bindingA.lastError).toBeUndefined();
    expect(bindingA.lastSyncAt).toBeDefined();

    // Board B fails — the sync handler fails and stamps the error on the binding.
    await syncTrelloBoardHandler
      .handler({ binding: Ref.make(bindingB) })
      .pipe(stubOperationService, Effect.provide(layer), Effect.either, EffectEx.runAndForwardErrors);
    expect(bindingB.lastError).toContain('boom');
    expect(bindingB.lastSyncAt).toBeUndefined();
  });
});
