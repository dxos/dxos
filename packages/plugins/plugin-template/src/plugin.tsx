//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject, ReactSurface, Schema } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const TemplatePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default TemplatePlugin;
