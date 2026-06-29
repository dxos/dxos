//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Voxel } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const VoxelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addSchemaModule({ schema: [Voxel.World] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default VoxelPlugin;
