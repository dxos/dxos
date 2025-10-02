//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { JournalEntryType, JournalType, OutlineType, OutlinerAction } from './types';

export const OutlinerPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [
      contributes(Capabilities.Metadata, {
        id: JournalType.typename,
        metadata: {
          icon: 'ph--calendar-check--regular',
        },
      }),
      contributes(Capabilities.Metadata, {
        id: OutlineType.typename,
        metadata: {
          icon: 'ph--tree-structure--regular',
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: JournalType,
          getIntent: () => createIntent(OutlinerAction.CreateJournal),
        }),
      ),
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: OutlineType,
          getIntent: () => createIntent(OutlinerAction.CreateOutline),
        }),
      ),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [JournalEntryType, JournalType, OutlineType]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
]);
