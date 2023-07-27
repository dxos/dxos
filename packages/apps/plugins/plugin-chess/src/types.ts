//
// Copyright 2023 DXOS.org
//

import { isTypedObject, Expando, TypedObject } from '@dxos/client/echo';

export const CHESS_PLUGIN = 'dxos.org/plugin/chess';

const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

export enum ChessAction {
  CREATE = `${CHESS_ACTION}/create`,
}

export type ChessProvides = {};

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'chess';
};
