//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Game } from '@dxos/chess-app';
import { isTypedObject, TypedObject } from '@dxos/client/echo';

export const CHESS_PLUGIN = 'dxos.org/plugin/chess';

const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

export enum ChessAction {
  CREATE = `${CHESS_ACTION}/create`,
}

export type ChessProvides = {};

export type ChessPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Game.name] = Game;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && object.__typename === Game.type.name;
};
