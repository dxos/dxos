//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { OperationHandler, ReactRoot, SpotlightDismiss, State } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpotlightPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(State),
  Plugin.addLazyModule(SpotlightDismiss),
  Plugin.addLazyModule(ReactRoot),
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

export default SpotlightPlugin;
