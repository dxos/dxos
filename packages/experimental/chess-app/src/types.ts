//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

export const MoveSchema = S.mutable(
  S.partial(
    S.struct({
      source: S.string,
      target: S.string,
      piece: S.string,
    }),
  ),
);

export class GameType extends EchoObjectSchema({ typename: 'dxos.experimental.chess.Game', version: '0.1.0' })(
  {
    playerWhite: S.string,
    playerBlack: S.string,
    moves: S.mutable(S.array(S.string)),
    pgn: S.string,
  },
  { partial: true },
) {}
