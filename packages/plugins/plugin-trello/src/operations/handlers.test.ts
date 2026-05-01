//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { InternalError } from '@dxos/errors';
import { Operation } from '@dxos/operation';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { TRELLO_SOURCE } from '../constants';
import { TrelloApi } from '../services';
import getTrelloBoardsHandler from './get-trello-boards';
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
 *  - The dialog records `{ remoteId, name }` entries on the Integration.
 *  - `SyncTrelloBoard` materializes the local Kanban on first sync, then
 *    populates its cards. Unselected boards leave no trace.
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
        account: 'me@example.com',
      }),
    );
    const integration = db.add(Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }));
    return { db, integration };
  };

  test('full flow: GetTrelloBoards (discovery) → SyncTrelloBoard (materializes selection) syncs only chosen boards', async ({
    expect,
  }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    // 1. Discovery: descriptors only — NO local Kanbans created yet.
    const discovered = await getTrelloBoardsHandler
      .handler({ integration: Ref.make(integration) })
      .pipe(Effect.provide(layer), runAndForwardErrors);
    expect(discovered.targets).toHaveLength(2);
    const boardA = discovered.targets.find((t) => t.id === 'board-a')!;
    expect(boardA.name).toBe('Board A');

    const kanbansAfterDiscovery = await db.query(Filter.type(Kanban.Kanban)).run();
    expect(kanbansAfterDiscovery).toHaveLength(0);

    // 2. Selection: record `{ remoteId, name }` for board A. The generic
    // `SetIntegrationTargets` op is covered by its own test; here we just
    // simulate the dialog's effect on `integration.targets`.
    Obj.change(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.targets = [{ remoteId: boardA.id, name: boardA.name }];
    });
    expect(integration.targets).toHaveLength(1);
    expect(integration.targets[0].object).toBeUndefined();

    // 3. Sync: lazily materializes board A's Kanban + reconciles its cards.
    const result = await syncTrelloBoardHandler
      .handler({ integration: Ref.make(integration) })
      .pipe(stubOperationService, Effect.provide(layer), runAndForwardErrors);
    expect(result.pulled.added).toBe(1);

    // Only board A's Kanban exists — board B was never selected.
    const allKanbans = await db.query(Filter.type(Kanban.Kanban)).run();
    expect(allKanbans).toHaveLength(1);
    const boardAKanban = allKanbans[0]!;
    expect(Obj.getMeta(boardAKanban).keys.find((key) => key.source === TRELLO_SOURCE)?.id).toBe('board-a');
    expect(boardAKanban.spec.kind === 'items' ? boardAKanban.spec.items.length : -1).toBe(1);

    // Sync wrote the materialized ref back into the target.
    expect(integration.targets[0].object?.target).toBeDefined();
  });

  test('failing fetch on one target writes lastError without affecting others', async ({ expect }) => {
    const trelloApi = await import('../services/trello-api');
    // Make fetchLists fail for board-b only.
    const fetchLists = trelloApi.fetchLists as unknown as ReturnType<typeof vi.fn>;
    fetchLists.mockImplementation((boardId: string) => {
      if (boardId === 'board-b') {
        return Effect.fail(new InternalError({ context: { reason: 'boom' } }));
      }
      return Effect.succeed([{ id: 'list-a1', name: 'To Do', closed: false, pos: 0 }]);
    });

    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const discovered = await getTrelloBoardsHandler
      .handler({ integration: Ref.make(integration) })
      .pipe(Effect.provide(layer), runAndForwardErrors);

    // Select both boards by recording `{ remoteId, name }` entries.
    Obj.change(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.targets = discovered.targets.map((t) => ({ remoteId: t.id, name: t.name }));
    });

    await syncTrelloBoardHandler
      .handler({ integration: Ref.make(integration) })
      .pipe(stubOperationService, Effect.provide(layer), runAndForwardErrors);

    const targetA = integration.targets.find((t) => t.remoteId === 'board-a');
    const targetB = integration.targets.find((t) => t.remoteId === 'board-b');
    expect(targetA?.lastError).toBeUndefined();
    expect(targetA?.lastSyncAt).toBeDefined();
    expect(targetB?.lastError).toContain('boom');
    expect(targetB?.lastSyncAt).toBeUndefined();
  });
});
