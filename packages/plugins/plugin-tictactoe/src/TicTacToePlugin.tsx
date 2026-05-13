//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TicTacToe } from '#types';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'game-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: GameVariant,
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [TicTacToe.State] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default TicTacToePlugin;
