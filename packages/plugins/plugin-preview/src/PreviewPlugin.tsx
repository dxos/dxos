//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Organization, Person } from '@dxos/types';

import { PreviewPopover, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const PreviewPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Person.Person, Organization.Organization], id: 'schema' }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'preview-popover',
    activatesOn: ActivationEvents.Startup,
    activate: PreviewPopover,
  }),
  Plugin.make,
);
