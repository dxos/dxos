//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, vi } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Chess } from '@dxos/plugin-chess/types';
import { Game } from '@dxos/plugin-game/types';

import { ChessComAccount, ChessComOperation } from '../types';
import { ChessComOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const SAMPLE_GAME = {
  url: 'https://www.chess.com/game/live/1',
  pgn: '[White "alice"]\n[Black "bob"]\n\n1. e4 e5 2. Nf3 Nc6 *',
  uuid: 'game-uuid-1',
  white: {
    'rating': 600,
    'result': 'win',
    '@id': 'https://api.chess.com/pub/player/alice',
    'username': 'alice',
    'uuid': 'w1',
  },
  black: {
    'rating': 600,
    'result': 'resigned',
    '@id': 'https://api.chess.com/pub/player/bob',
    'username': 'bob',
    'uuid': 'b1',
  },
};

const SAMPLE_PLAYER = {
  'player_id': 1,
  '@id': 'https://api.chess.com/pub/player/testuser',
  'url': 'https://www.chess.com/member/testuser',
  'username': 'testuser',
  'followers': 3,
  'country': 'https://api.chess.com/pub/country/US',
  'last_online': 1_700_000_000,
  'joined': 1_600_000_000,
  'status': 'basic',
  'is_streamer': false,
  'verified': false,
  'league': 'Silver',
  'streaming_platforms': [],
};

const TestLayer = AssistantTestLayer({
  operationHandlers: ChessComOperationHandlerSet,
  types: [Feed.Feed, ChessComAccount.Account, Chess.State, Game.Game],
  disableLlmMemoization: true,
});

describe('ClearSyncedGames', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/player/testuser')) {
          return Response.json(SAMPLE_PLAYER);
        }
        if (url.endsWith('/player/testuser/games/archives')) {
          return Response.json({ archives: ['https://api.chess.com/pub/player/testuser/games/2026/07'] });
        }
        if (url.endsWith('/games/2026/07')) {
          return Response.json({ games: [SAMPLE_GAME] });
        }
        return new Response('not found', { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    'removes synced games and chess state from the feed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const account = yield* Database.add(ChessComAccount.makeAccount({ username: 'testuser' }));
        yield* Database.flush();

        yield* Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) });

        const oldFeed = yield* Database.load(account.games);
        expect(yield* Feed.query(oldFeed, Filter.type(Game.Game)).run).toHaveLength(1);
        expect(yield* Feed.query(oldFeed, Filter.type(Chess.State)).run).toHaveLength(1);

        const result = yield* Operation.invoke(ChessComOperation.ClearSyncedGames, { account: Ref.make(account) });
        expect(result.removed).toBe(1);

        const newFeed = yield* Database.load(account.games);
        expect(newFeed.id).not.toBe(oldFeed.id);
        expect(yield* Feed.query(newFeed, Filter.type(Game.Game)).run).toHaveLength(0);
        expect(yield* Feed.query(newFeed, Filter.type(Chess.State)).run).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'allows re-sync after clear',
    Effect.fnUntraced(
      function* ({ expect }) {
        const account = yield* Database.add(ChessComAccount.makeAccount({ username: 'testuser' }));
        yield* Database.flush();

        yield* Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) });
        yield* Operation.invoke(ChessComOperation.ClearSyncedGames, { account: Ref.make(account) });

        const resync = yield* Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) });
        expect(resync.appended).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
