//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { DailySummarySettings } from './capabilities';
import { DailySummaryBlueprint } from './blueprints';
import { meta } from './meta';
import { translations } from './translations';

export const DailySummaryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({
    activate: () =>
      import('./capabilities/blueprint-definition-module').then((m) => m.default),
  }),
  AppPlugin.addSettingsModule({ activate: DailySummarySettings }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
