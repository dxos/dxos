//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CommentConfig, CreateObject, OperationHandler, ReactSurface, SketchSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sketch } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SketchPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CommentConfig),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Sketch.Canvas, Sketch.Sketch])),
  Plugin.addLazyModule(SketchSettings),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SketchPlugin;
