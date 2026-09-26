//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PwaSettings, ReactSurface, RegisterPwa, Translations, UpdateProgress } from '#capabilities';
import { meta } from '#meta';

export const PwaPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PwaSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegisterPwa),
  Plugin.addModule(Translations),
  Plugin.addModule(UpdateProgress),
  Plugin.make,
);

export default PwaPlugin;
