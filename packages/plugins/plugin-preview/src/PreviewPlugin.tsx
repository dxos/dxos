//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { Organization, Person } from '@dxos/types';

import { PreviewPopover, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const PreviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [Capability.contributes(ClientCapabilities.Schema, [Person.Person, Organization.Organization])],
  }),
  Plugin.addModule({
    id: 'preview-popover',
    activatesOn: Events.Startup,
    activate: PreviewPopover,
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.make,
);
