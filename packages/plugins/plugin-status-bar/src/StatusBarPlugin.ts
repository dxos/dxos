//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const StatusBarPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
