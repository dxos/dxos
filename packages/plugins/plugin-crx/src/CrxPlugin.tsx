//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CrxSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export default Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: CrxSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
