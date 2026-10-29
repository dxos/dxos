//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PwaSettings, ReactSurface, RegisterPush, RegisterPwa, Translations, UpdateProgress } from '#capabilities';
import { meta } from '#meta';
import { type PwaOptions } from '#types';

export const PwaPlugin = Plugin.define<PwaOptions.PwaPluginOptions>(meta).pipe(
  Plugin.addModule(PwaSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegisterPush),
  Plugin.addModule(RegisterPwa),
  Plugin.addModule(Translations),
  Plugin.addModule(UpdateProgress),
  Plugin.make,
);

export default PwaPlugin;
