//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export const MoveSchema = S.mutable(
  S.partial(
    S.struct({
      source: S.string,
      target: S.string,
      piece: S.string,
    }),
  ),
);

export class GameType extends TypedObject({ typename: 'dxos.org/type/Chess', version: '0.1.0' })(
  {
    playerWhite: S.string,
    playerBlack: S.string,
    moves: S.mutable(S.array(S.string)),
    pgn: S.string,
  },
  { partial: true },
) {}
