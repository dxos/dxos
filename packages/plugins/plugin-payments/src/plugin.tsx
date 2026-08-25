//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ReactSurface, Settings, Translations } from '#capabilities';
import { meta } from '#meta';

export const PaymentsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Settings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default PaymentsPlugin;
