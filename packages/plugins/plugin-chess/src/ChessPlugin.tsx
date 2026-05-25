//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';

import { BlueprintDefinition, GameVariant, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Chess } from '#types';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'game-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: GameVariant,
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Chess.State] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ChessPlugin;
