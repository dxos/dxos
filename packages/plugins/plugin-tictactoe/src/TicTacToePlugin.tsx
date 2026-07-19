//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TicTacToe } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(GameVariant),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([TicTacToe.State])),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({ pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' }),
  ),
  Plugin.make,
);

export default TicTacToePlugin;
