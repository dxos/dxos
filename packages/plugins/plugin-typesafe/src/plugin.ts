//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, LayerSpecs, SettingsModule } from '#capabilities';
import { meta } from '#meta';

export const TypeSafePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(LayerSpecs),
  Plugin.addModule(SettingsModule),
  Plugin.make,
);

export default TypeSafePlugin;
