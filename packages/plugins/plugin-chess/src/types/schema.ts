//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export const MoveSchema = S.mutable(
  S.partial(
    S.Struct({
      source: S.String,
      target: S.String,
      piece: S.String,
    }),
  ),
);

export class GameType extends TypedObject({ typename: 'dxos.org/type/Chess', version: '0.1.0' })(
  {
    playerWhite: S.String,
    playerBlack: S.String,
    moves: S.mutable(S.Array(S.String)),
    pgn: S.String,
  },
  { partial: true },
) {}
