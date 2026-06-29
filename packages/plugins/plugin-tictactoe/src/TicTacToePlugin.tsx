//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TicTacToe } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'game-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: GameVariant,
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [TicTacToe.State] }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TicTacToePlugin;
