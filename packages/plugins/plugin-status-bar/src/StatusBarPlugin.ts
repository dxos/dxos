//
// Copyright 2024 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const StatusBarPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);
