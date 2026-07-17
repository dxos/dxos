//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TicTacToe } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(GameVariant),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [TicTacToe.State] }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TicTacToePlugin;
