//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Chess from '@dxos/plugin-chess/Chess';
import * as Game from '@dxos/plugin-game/Game';

export type Stage = 'opening' | 'middlegame' | 'endgame' | 'finished';

export type GameSeed = {
  readonly name: string;
  readonly white: string;
  readonly black: string;
  readonly stage: Stage;
  /** Moves from the start; a game in progress ends `*`, a finished one with its result. */
  readonly pgn?: string;
  /** A study position set up on its own, with no moves leading to it. */
  readonly fen?: string;
};

/**
 * Sixteen boards at every stage: famous finished games, a classic stopped at its turning point, eight openings a few
 * moves in, and three endgame studies set up by position. Every PGN is legal to its last move (the test replays them).
 */
export const GAMES: ReadonlyArray<GameSeed> = [
  {
    name: "Fool's Mate",
    white: 'Pat',
    black: 'Sam',
    stage: 'finished',
    pgn: '1. f3 e5 2. g4 Qh4# 0-1',
  },
  {
    name: "Scholar's Mate",
    white: 'Sam',
    black: 'Pat',
    stage: 'finished',
    pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0',
  },
  {
    name: 'The Opera Game (Paris, 1858)',
    white: 'Paul Morphy',
    black: 'Duke Karl and Count Isouard',
    stage: 'finished',
    pgn:
      '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 ' +
      '10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 ' +
      '17. Rd8# 1-0',
  },
  {
    name: 'The Immortal Game (London, 1851)',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    stage: 'finished',
    pgn:
      '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 ' +
      '10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 ' +
      '18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0',
  },
  {
    name: 'The Evergreen Game (Berlin, 1852)',
    white: 'Adolf Anderssen',
    black: 'Jean Dufresne',
    stage: 'finished',
    pgn:
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 ' +
      '10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 ' +
      '18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0',
  },
  {
    name: "Loyd's ten-move stalemate",
    white: 'Sam Loyd',
    black: 'Study',
    stage: 'finished',
    pgn: '1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2',
  },
  {
    name: 'The Game of the Century (New York, 1956)',
    white: 'Donald Byrne',
    black: 'Bobby Fischer',
    stage: 'middlegame',
    // Stopped on 17...Be6!, the queen sacrifice, so the board waits on White's reply.
    pgn:
      '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 ' +
      '10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 *',
  },
  {
    name: 'Ruy Lopez, Closed',
    white: 'Ana',
    black: 'Ben',
    stage: 'opening',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O *',
  },
  {
    name: 'Sicilian, Najdorf',
    white: 'Chen',
    black: 'Dana',
    stage: 'opening',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 *',
  },
  {
    name: "Queen's Gambit Declined",
    white: 'Eli',
    black: 'Fay',
    stage: 'opening',
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 *',
  },
  {
    name: 'Italian, Giuoco Pianissimo',
    white: 'Gus',
    black: 'Hana',
    stage: 'opening',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 *',
  },
  {
    name: "King's Indian, Classical",
    white: 'Ivo',
    black: 'Jun',
    stage: 'middlegame',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1 Nd7 10. Be3 f5 *',
  },
  {
    name: 'French, Advance',
    white: 'Kai',
    black: 'Lea',
    stage: 'opening',
    pgn: '1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. a3 *',
  },
  {
    name: 'Caro-Kann, Classical',
    white: 'Mo',
    black: 'Nia',
    stage: 'opening',
    pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 *',
  },
  {
    name: 'Study: the Lucena position',
    white: 'Study',
    black: 'Study',
    stage: 'endgame',
    // White builds a bridge with the rook to shelter the king and promote.
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
  },
  {
    name: 'Study: king and pawn, the opposition',
    white: 'Study',
    black: 'Study',
    stage: 'endgame',
    fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
  },
];

export type GamesResult = { games: Game.Game[] };

/** Every seed as a chess state and the game that holds it. */
export const Games: SampleSpace.Partial<GamesResult> = SampleSpace.partial('games', {
  schemas: [Game.Game, Chess.State],
  run: () =>
    Effect.gen(function* () {
      const games: Game.Game[] = [];
      for (const seed of GAMES) {
        // The board replays `pgn` only, so a study carries its position as a PGN set-up header as well.
        const pgn = seed.pgn ?? (seed.fen ? `[SetUp "1"]\n[FEN "${seed.fen}"]\n\n*` : undefined);
        const state = yield* Database.add(Chess.make({ pgn, fen: seed.fen }));
        games.push(
          yield* Database.add(
            Game.make({
              name: seed.name,
              description: Chess.fen({ pgn, fen: seed.fen }),
              players: [
                { role: 'white', name: seed.white },
                { role: 'black', name: seed.black },
              ],
              variant: state,
            }),
          ),
        );
      }
      return { games };
    }),
});
