//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  Bridge,
  Detector,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Recorder,
  RecorderSettings,
  RecorderState,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const MeetingRecorderPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Bridge),
  Plugin.addModule(Detector),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Recorder),
  Plugin.addModule(RecorderSettings),
  Plugin.addModule(RecorderState),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default MeetingRecorderPlugin;
