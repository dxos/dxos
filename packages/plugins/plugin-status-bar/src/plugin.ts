//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

export const StatusBarPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default StatusBarPlugin;
