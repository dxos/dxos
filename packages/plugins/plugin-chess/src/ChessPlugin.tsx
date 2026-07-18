//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Chess, ChessPositionIndex, PlayerReview } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(GameVariant),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addLazyModule(AppCapability.schema([Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review])),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ChessPlugin;
