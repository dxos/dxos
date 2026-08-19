//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { PreviewPopover, ReactSurface, Schema, UnsupportedTypeSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

import type { PreviewPluginOptions } from './types';

export const PreviewPlugin = Plugin.define<PreviewPluginOptions>(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(UnsupportedTypeSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(PreviewPopover),
  Plugin.make,
);

export default PreviewPlugin;
