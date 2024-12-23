//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { isReactiveObject } from '@dxos/live-object';
import { type SchemaProvides } from '@dxos/plugin-space';

import { GameType } from './schema';
import { CHESS_PLUGIN } from '../meta';

export namespace ChessAction {
  const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CHESS_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: GameType,
    }),
  }) {}
}

export type ChessProvides = {};

export type ChessPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;

export const isObject = (object: unknown): object is GameType => {
  return isReactiveObject(object) && object instanceof GameType;
};
