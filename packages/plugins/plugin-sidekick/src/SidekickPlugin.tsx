//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Profile, Sidekick } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SidekickPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addSchemaModule({ schema: [Sidekick.Profile, Profile.Profile] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SidekickPlugin;
