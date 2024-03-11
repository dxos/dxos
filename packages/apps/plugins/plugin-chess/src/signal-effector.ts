//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { Chess } from 'chess.js';
import * as Either from 'effect/Either';

import { type Game } from '@dxos/chess-app';
import { type Signal, SignalBusInterconnect } from '@dxos/functions-signal';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { MoveSuggestionOutputFormat } from './signal-trigger';

const MoveSuggestionSignal = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('make-next-chess-move'),
    value: MoveSuggestionOutputFormat,
  }),
});

const ConfirmedMoveSuggestionSignal = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('make-next-chess-move-confirmed'),
    value: MoveSuggestionOutputFormat,
  }),
});

export const createMoveConfirmationEffector = (space: Space) => {
  const bus = SignalBusInterconnect.global.createConnected(space);
  const validator = S.validateEither(MoveSuggestionSignal);
  return bus.subscribe((signal: Signal) => {
    const validation = validator(signal);
    if (Either.isLeft(validation)) {
      return;
    }
    const data = validation.right.data.value;
    log.info('move suggestion received', { data });
    bus.emit({
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
            type: 'make-next-chess-move-confirmed',
            data,
          }),
          activeObjectId: data.gameId,
        },
      },
    });
  });
};

export const createExecuteMoveEffector = (space: Space) => {
  const bus = SignalBusInterconnect.global.createConnected(space);
  const validator = S.validateEither(ConfirmedMoveSuggestionSignal);
  return bus.subscribe((signal: Signal) => {
    const validation = validator(signal);
    if (Either.isLeft(validation)) {
      return;
    }
    const data = validation.right.data.value;
    log.info('user confirmed move suggestion', { data });
    const game: Game | undefined = space.db.getObjectById(data.gameId);
    if (game == null || game.pgn !== data.inputGameState) {
      return;
    }
    const chess = new Chess();
    chess.load(data.inputGameState);
    chess.move({ from: data.from, to: data.to });
    game.pgn = chess.pgn();
  });
};
