//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Organization, Person } from '@dxos/types';

import { PreviewPopover, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const PreviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Person.Person, Organization.Organization])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(PreviewPopover),
  Plugin.make,
);

export default PreviewPlugin;
