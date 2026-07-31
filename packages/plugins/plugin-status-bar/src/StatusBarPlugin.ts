//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const StatusBarPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default StatusBarPlugin;
