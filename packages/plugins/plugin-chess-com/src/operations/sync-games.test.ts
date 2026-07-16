//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, vi } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
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

describe('SyncGames', () => {
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
    'imports games and deduplicates on re-sync',
    Effect.fnUntraced(
      function* ({ expect }) {
        const account = yield* Database.add(ChessComAccount.makeAccount({ username: 'testuser' }));
        yield* Database.flush();

        const first = yield* Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) });
        expect(first.appended).toBe(1);

        const echoFeed = yield* Database.load(account.games);
        const gamesAfterFirst = yield* Feed.query(echoFeed, Filter.type(Game.Game)).run;
        expect(gamesAfterFirst).toHaveLength(1);
        expect(gamesAfterFirst[0]?.name).toBe('alice vs bob');

        const chessStates = yield* Feed.query(echoFeed, Filter.type(Chess.State)).run;
        expect(chessStates).toHaveLength(1);

        const variant = yield* Database.load(gamesAfterFirst[0]!.variant);
        expect(Obj.instanceOf(Chess.State, variant)).toBe(true);

        const second = yield* Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) });
        expect(second.appended).toBe(0);

        const gamesAfterSecond = yield* Feed.query(echoFeed, Filter.type(Game.Game)).run;
        expect(gamesAfterSecond).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
