//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Integration } from '@dxos/plugin-integration/types';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { TRELLO_SOURCE } from '../constants';
import { type TrelloBoard, type TrelloCard, type TrelloList } from '../services/trello-api';
import getTrelloBoardsHandler from './get-trello-boards';
import syncTrelloBoardHandler from './sync-trello-board';

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
    // Real `trello-api` functions return `Effect<T, HttpClientError, HttpClient>`.
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
 * Light end-to-end stitching of the three operation handlers:
 *  - `GetTrelloBoards` materializes Kanban placeholders + returns descriptors.
 *  - `SetIntegrationTargets` selects a subset of those.
 *  - `SyncTrelloBoard` populates cards for the selected targets only.
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
    const integration = db.add(
      Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }),
    );
    return { db, integration };
  };

  test('full flow: GetTrelloBoards → SetIntegrationTargets → SyncTrelloBoard syncs only chosen boards', async ({
    expect,
  }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    // 1. Discovery: materializes a Kanban per remote board.
    const discovered = await getTrelloBoardsHandler.handler({ integration: Ref.make(integration) }).pipe(
      Effect.provide(layer),
      runAndForwardErrors,
    );
    expect(discovered.targets).toHaveLength(2);
    const boardA = discovered.targets.find((t) => t.id === 'board-a')!;
    expect(boardA.name).toBe('Board A');

    // 2. Selection: pick only board A. (The generic SetIntegrationTargets diff is
    // already covered by `plugin-integration/src/operations/set-integration-targets.test.ts`;
    // here we just simulate selection by directly mutating the integration's targets.)
    Obj.change(integration, (mutable) => {
      const m = mutable as Obj.Mutable<typeof mutable>;
      m.targets = [{ object: boardA.object }];
    });
    expect(integration.targets).toHaveLength(1);

    // 3. Sync: reconciles cards for board A only.
    const result = await syncTrelloBoardHandler.handler({ integration: Ref.make(integration) }).pipe(
      Effect.provide(layer),
      runAndForwardErrors,
    );
    expect(result.pulled.added).toBe(1);

    // Board B's Kanban exists but isn't in the integration's targets, so its cards weren't synced.
    const allKanbans = await db.query(Filter.type(Kanban.Kanban)).run();
    expect(allKanbans).toHaveLength(2);
    const boardAKanban = allKanbans.find((k) =>
      Obj.getMeta(k).keys.find((key) => key.source === TRELLO_SOURCE)?.id === 'board-a',
    );
    const boardBKanban = allKanbans.find((k) =>
      Obj.getMeta(k).keys.find((key) => key.source === TRELLO_SOURCE)?.id === 'board-b',
    );
    expect(boardAKanban?.spec.kind === 'items' ? boardAKanban.spec.items.length : -1).toBe(1);
    expect(boardBKanban?.spec.kind === 'items' ? boardBKanban.spec.items.length : -1).toBe(0);
  });

  test('failing fetch on one target writes lastError without affecting others', async ({ expect }) => {
    const trelloApi = await import('../services/trello-api');
    // Make fetchLists fail for board-b only.
    const fetchLists = trelloApi.fetchLists as unknown as ReturnType<typeof vi.fn>;
    fetchLists.mockImplementation((boardId: string) => {
      if (boardId === 'board-b') return Effect.fail(new Error('boom'));
      return Effect.succeed([{ id: 'list-a1', name: 'To Do', closed: false, pos: 0 }]);
    });

    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const discovered = await getTrelloBoardsHandler.handler({ integration: Ref.make(integration) }).pipe(
      Effect.provide(layer),
      runAndForwardErrors,
    );
    // Select both boards.
    Obj.change(integration, (mutable) => {
      const m = mutable as Obj.Mutable<typeof mutable>;
      m.targets = discovered.targets.map((t) => ({ object: t.object }));
    });

    await syncTrelloBoardHandler.handler({ integration: Ref.make(integration) }).pipe(
      Effect.provide(layer),
      runAndForwardErrors,
    );

    const targetA = integration.targets.find((t) =>
      discovered.targets.find((d) => d.id === 'board-a')?.object.dxn.toString() === t.object.dxn.toString(),
    );
    const targetB = integration.targets.find((t) =>
      discovered.targets.find((d) => d.id === 'board-b')?.object.dxn.toString() === t.object.dxn.toString(),
    );
    expect(targetA?.lastError).toBeUndefined();
    expect(targetA?.lastSyncAt).toBeDefined();
    expect(targetB?.lastError).toContain('boom');
    expect(targetB?.lastSyncAt).toBeUndefined();
  });
});
