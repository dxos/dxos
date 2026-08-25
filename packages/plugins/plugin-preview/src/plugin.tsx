//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PreviewPopover, ReactSurface, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

export const PreviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PreviewPopover),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default PreviewPlugin;
