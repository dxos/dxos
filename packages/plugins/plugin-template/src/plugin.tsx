//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CreateObject, ReactSurface, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

export const TemplatePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TemplatePlugin;
