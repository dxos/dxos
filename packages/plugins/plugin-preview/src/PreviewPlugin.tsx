//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { Organization, Person } from '@dxos/types';

import { PreviewPopover, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const PreviewPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSchemaModule({ schema: [Person.Person, Organization.Organization], id: 'schema' }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: 'preview-popover',
    activatesOn: Common.ActivationEvent.Startup,
    activate: PreviewPopover,
  }),
  Plugin.make,
);
