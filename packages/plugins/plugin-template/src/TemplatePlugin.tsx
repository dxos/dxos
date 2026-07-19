//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Template } from '#types';

export const TemplatePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppCapability.schema([Template.Data])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default TemplatePlugin;
