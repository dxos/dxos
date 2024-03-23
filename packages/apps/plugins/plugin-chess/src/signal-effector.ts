//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { Chess } from 'chess.js';

import { type Game } from '@dxos/chess-app';
import { Effector } from '@dxos/functions-signal';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { MoveSuggestionOutputFormat } from './signal-trigger';

const TYPE_MAKE_NEXT_CHESS_MOVE = 'make-next-chess-move';
const TYPE_MAKE_NEXT_CHESS_MOVE_CONFIRMED = `${TYPE_MAKE_NEXT_CHESS_MOVE}-confirmed`;

export const createMoveConfirmationEffector = (space: Space) => {
  const MoveSuggestionSignal = S.struct({
    kind: S.literal('suggestion'),
    data: S.struct({
      type: S.literal(TYPE_MAKE_NEXT_CHESS_MOVE),
      value: MoveSuggestionOutputFormat,
    }),
  });
  return Effector.forSignalSchema(space, MoveSuggestionSignal, (effectorCtx, signal) => {
    const data = signal.data.value;
    log.info('move suggestion received', { data });
    effectorCtx.bus.emitLocal({
      id: PublicKey.random().toHex(),
      kind: 'suggestion',
      metadata: {
        createdMs: Date.now(),
        source: 'plugin-chess',
      },
      data: {
        type: 'threads.signal-confirmation',
        value: {
          senderKey: PublicKey.random().toHex(),
          message: data.explanation,
          confirmationSignalData: JSON.stringify({
            type: TYPE_MAKE_NEXT_CHESS_MOVE_CONFIRMED,
            value: data,
          }),
          activeObjectId: data.gameId,
        },
      },
    });
  });
};

export const createExecuteMoveEffector = (space: Space) => {
  const ConfirmedMoveSuggestionSignal = S.struct({
    kind: S.literal('suggestion'),
    data: S.struct({
      type: S.literal(TYPE_MAKE_NEXT_CHESS_MOVE_CONFIRMED),
      value: MoveSuggestionOutputFormat,
    }),
  });
  return Effector.forSignalSchema(space, ConfirmedMoveSuggestionSignal, (effectorCtx, signal) => {
    const data = signal.data.value;
    log.info('user confirmed move suggestion', { data });
    const game: Game | undefined = space.db.getObjectById(data.gameId);
    if (game == null || game.pgn !== data.inputGameState) {
      return;
    }
    const chess = new Chess();
    chess.loadPgn(data.inputGameState);
    chess.move({ from: data.from, to: data.to });
    game.pgn = chess.pgn();
  });
};
