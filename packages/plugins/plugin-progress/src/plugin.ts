//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ProgressRegistry, ReactSurface, TraceProgressSink, Translations } from '#capabilities';
import { meta } from '#meta';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ProgressRegistry),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(TraceProgressSink),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ProgressPlugin;
