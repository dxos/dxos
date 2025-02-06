//
// Copyright 2023 DXOS.org
//

import { isInstanceOf, S } from '@dxos/echo-schema';
import { isReactiveObject } from '@dxos/live-object';

import { ChessType } from './schema';
import { CHESS_PLUGIN } from '../meta';

export namespace ChessAction {
  const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CHESS_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
      fen: S.optional(S.String),
    }),
    output: S.Struct({
      object: ChessType,
    }),
  }) {}
}

export const isObject = (object: unknown): object is typeof ChessType => {
  return isReactiveObject(object) && isInstanceOf(ChessType, object);
};
