//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface, Settings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const PaymentsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);

export default PaymentsPlugin;
