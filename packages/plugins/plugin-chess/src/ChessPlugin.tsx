//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { GameVariant, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Chess, ChessPositionIndex, PlayerReview } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'game-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: GameVariant,
  }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ChessPlugin;
