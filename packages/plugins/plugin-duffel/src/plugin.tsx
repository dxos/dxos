//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Duffel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const DuffelPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Duffel),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default DuffelPlugin;
