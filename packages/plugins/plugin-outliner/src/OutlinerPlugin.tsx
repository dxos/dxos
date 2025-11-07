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
import { Journal, Outline, OutlineAction } from './types';

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
        id: Journal.Journal.typename,
        metadata: {
          icon: 'ph--calendar-check--regular',
          iconHue: 'indigo',
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Outline.Outline.typename,
        metadata: {
          icon: 'ph--tree-structure--regular',
          iconHue: 'indigo',
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
          objectSchema: Journal.Journal,
          getIntent: () => createIntent(OutlineAction.CreateJournal),
        }),
      ),
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: Outline.Outline,
          getIntent: () => createIntent(OutlineAction.CreateOutline),
        }),
      ),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Journal.JournalEntry, Journal.Journal, Outline.Outline]),
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
