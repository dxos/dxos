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
import { isReactiveObject } from '@dxos/live-object';
import { type SchemaProvides } from '@dxos/plugin-space';

import { GameType } from './schema';
import { CHESS_PLUGIN } from '../meta';

const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

export enum ChessAction {
  CREATE = `${CHESS_ACTION}/create`,
}

export type ChessProvides = {};

export type ChessPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;

export const isObject = (object: unknown): object is GameType => {
  return isReactiveObject(object) && object instanceof GameType;
};
