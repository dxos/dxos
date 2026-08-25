//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Duffel, Translations } from '#capabilities';
import { meta } from '#meta';

export const DuffelPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Duffel),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DuffelPlugin;
