//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { Game } from '@dxos/chess-app';
import { isTypedObject } from '@dxos/react-client/echo';

import { CHESS_PLUGIN } from './meta';

const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

export enum ChessAction {
  CREATE = `${CHESS_ACTION}/create`,
}

export type ChessProvides = {};

export type ChessPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isObject = (object: unknown): object is Game => {
  return isTypedObject(object) && object.__typename === Game.schema.typename;
};
