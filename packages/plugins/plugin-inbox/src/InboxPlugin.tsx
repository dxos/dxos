//
// Copyright 2024 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

import {
  AppGraphBuilder,
  BLUEPRINT_KEY,
  BlueprintDefinition,
  InboxState,
  IntentResolver,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Calendar, InboxAction, Mailbox } from './types';

export const InboxPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/state`,
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Events.SetupSettings,
    activate: InboxState,
  }),
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
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: 'ph--tray--regular',
          blueprints: [BLUEPRINT_KEY],
        },
      }),
      contributes(Capabilities.Metadata, {
        id: DataType.Message.typename,
        metadata: {
          icon: 'ph--note--regular',
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Calendar.Calendar.typename,
        metadata: {
          icon: 'ph--calendar--regular',
        },
      }),
      contributes(Capabilities.Metadata, {
        id: DataType.Event.typename,
        metadata: {
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (event: DataType.Event) => await Ref.Array.loadAll(event.links ?? []),
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
          objectSchema: Mailbox.Mailbox,
          getIntent: (_, options) => createIntent(InboxAction.CreateMailbox, { space: options.space }),
        }),
      ),
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: Calendar.Calendar,
          getIntent: () => createIntent(InboxAction.CreateCalendar),
        }),
      ),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
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
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);
