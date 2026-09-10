//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Chess from '@dxos/plugin-chess/Chess';
import * as Game from '@dxos/plugin-game/Game';

//
// The thing the finished server gets pointed at.
//
// The last stage's definition of done is a chat answering "what is the best move here?" from the
// engine rather than from what the model already knows, so the space ships a position to ask it
// about. Seeded as a game rather than a bare FEN in the brief because the chess chat opens on a
// Game — a position the reader has to paste in is a step that will be skipped.
//
// A Spanish opening five moves deep: quiet, symmetrical, and with no forced tactic, so a plausible
// answer produced without calling the tool is not accidentally the right one.
//

const OPENING_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *';

export type GameResult = { game: Game.Game; state: Chess.State };

/** The position the deployed engine is asked about, as a game the chess chat can open. */
export const ChessGame: SampleSpace.Phase<GameResult> = SampleSpace.phase('game', {
  schemas: [Game.Game, Chess.State],
  run: () =>
    Effect.gen(function* () {
      const state = yield* Database.add(Chess.make({ pgn: OPENING_PGN }));
      const game = yield* Database.add(
        Game.make({
          name: 'Test position — Spanish, 5 moves in',
          players: [
            { role: 'white', name: 'You' },
            { role: 'black', name: 'Engine' },
          ],
          variant: state,
        }),
      );

      return { game, state };
    }),
});
