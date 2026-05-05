//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, BlueprintDefinition, ReactSurface, Settings } from '#capabilities';
import { meta } from '#meta';
import { translations } from './translations';

export const SlackPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: Settings,
  }),
  Plugin.make,
);
