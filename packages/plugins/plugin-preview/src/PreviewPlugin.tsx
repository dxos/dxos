//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Organization, Person } from '@dxos/types';

import { PreviewPopover, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const PreviewPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule<void>({ schema: [Person.Person, Organization.Organization] }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  Plugin.addModule({
    id: 'preview-popover',
    requires: PreviewPopover.requires,
    provides: PreviewPopover.provides,
    activate: PreviewPopover,
  }),
  Plugin.make,
);

export default PreviewPlugin;
