//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { BlueprintDefinition, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Profile, Sidekick } from '#types';

export const SidekickPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addSchemaModule({ schema: [Sidekick.Profile, Profile.Profile] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default SidekickPlugin;
