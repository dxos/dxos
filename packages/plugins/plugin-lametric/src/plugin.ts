//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { LaMetricSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const LaMetricPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(LaMetricSettings),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default LaMetricPlugin;
