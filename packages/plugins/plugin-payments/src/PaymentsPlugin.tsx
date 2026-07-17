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
  AppPlugin.addSettingsModule({ requires: Settings.requires, provides: Settings.provides, activate: Settings }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  Plugin.make,
);

export default PaymentsPlugin;
