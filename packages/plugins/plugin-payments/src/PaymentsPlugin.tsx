//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ReactSurface, Settings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const PaymentsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(Settings),
  Plugin.addModule(ReactSurface),
  Plugin.make,
);

export default PaymentsPlugin;
