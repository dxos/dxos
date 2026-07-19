//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Voxel } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const VoxelPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppCapability.schema([Voxel.World])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({ pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' }),
  ),
  Plugin.make,
);

export default VoxelPlugin;
