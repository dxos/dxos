//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { ProgressRegistry, ReactSurface, TraceProgressSink } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ProgressRegistry),
  Plugin.addModule(TraceProgressSink),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ProgressPlugin;
