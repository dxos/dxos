//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TokenManagerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [AccessToken.AccessToken]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
