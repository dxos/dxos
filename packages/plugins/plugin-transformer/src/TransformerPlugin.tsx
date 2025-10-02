//
// Copyright 2024 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

// import { IntentResolver } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TransformerPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [],
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, []),
  }),
  // defineModule({
  //   id: `${meta.id}/module/intent-resolver`,
  //   activatesOn: Events.SetupIntentResolver,
  //   activate: IntentResolver,
  // }),
]);
