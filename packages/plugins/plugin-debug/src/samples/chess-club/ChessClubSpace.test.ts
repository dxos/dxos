//
// Copyright 2026 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as ChessClubSpace from './ChessClubSpace.ts';
import { DATA_CENTERS } from './data-centers.ts';
import { GAMES } from './games.ts';

describe('Chess Club template', () => {
  test('every game is legal to its last move and in the stage it claims', ({ expect }) => {
    expect(GAMES).toHaveLength(16);
    const stages = new Set(GAMES.map((game) => game.stage));
    expect([...stages].sort()).toEqual(['endgame', 'finished', 'middlegame', 'opening']);
    for (const game of GAMES) {
      const chess = new ChessJS();
      if (game.pgn) {
        // `loadPgn` throws on the first illegal move, so a typo cannot leave a game silently truncated.
        chess.loadPgn(game.pgn);
        const moves = game.pgn
          .replace(/\d+\.\s*/g, '')
          .split(/\s+/)
          .filter((token) => !/^(\*|1-0|0-1|1\/2-1\/2)$/.test(token));
        expect(chess.history(), game.name).toHaveLength(moves.length);
      } else {
        expect(game.fen, game.name).toBeDefined();
        chess.load(game.fen ?? '');
      }
      expect(chess.isGameOver(), game.name).toBe(game.stage === 'finished');
    }
  });

  test('every data centre has a distinct code and a location on the globe', ({ expect }) => {
    expect(DATA_CENTERS.length).toBeGreaterThan(300);
    expect(new Set(DATA_CENTERS.map(([code]) => code)).size).toBe(DATA_CENTERS.length);
    for (const [code, , lng, lat] of DATA_CENTERS) {
      expect(Math.abs(lng), code).toBeLessThanOrEqual(180);
      expect(Math.abs(lat), code).toBeLessThanOrEqual(90);
    }
  });

  test('builds the games and a map pinned on every data centre', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(ChessClubSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.game:')).toBe(16);
    expect(countOf('type.chess.state')).toBe(16);
    expect(countOf('type.map')).toBe(1);
    expect(countOf('type.organization')).toBe(DATA_CENTERS.length);

    // The map's view pivots on the organizations' location, which is what the map plots.
    const {
      objects,
    }: {
      objects: Array<{
        '@type'?: string;
        'projection'?: { pivotFieldId?: string; fields?: Array<{ id: string; path: string }> };
      }>;
    } = JSON.parse(json);
    const view = objects.find((object) => object['@type']?.includes('type.view'));
    const pivot = view?.projection?.fields?.find((field) => field.id === view.projection?.pivotFieldId);
    expect(pivot?.path).toBe('location');
  });
});
