//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { Duffel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const DuffelPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(Duffel),
  Plugin.make,
);

export default DuffelPlugin;
