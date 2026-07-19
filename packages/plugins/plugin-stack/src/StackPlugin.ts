//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Stack } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const StackPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Stack.Stack])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default StackPlugin;
