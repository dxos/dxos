//
// Copyright 2024 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

// import { IntentResolver } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TransformerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, []),
  }),
  // Plugin.addModule({
  //   id: 'intent-resolver',
  //   activatesOn: Events.SetupIntentResolver,
  //   activate: IntentResolver,
  // }),
  Plugin.make,
);
