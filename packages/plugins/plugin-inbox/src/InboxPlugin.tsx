//
// Copyright 2024 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { RefArray } from '@dxos/live-object';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { MessageType } from '@dxos/schema';

import { AppGraphBuilder, ArtifactDefinition, InboxState, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';
import { CalendarType, ContactsType, EventType, InboxAction, MailboxType } from './types';

export const InboxPlugin = () =>
  definePlugin(meta, [
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
          id: MailboxType.typename,
          metadata: {
            icon: 'ph--tray--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: ContactsType.typename,
          metadata: {
            icon: 'ph--address-book--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: MessageType.typename,
          metadata: {
            icon: 'ph--note--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: CalendarType.typename,
          metadata: {
            icon: 'ph--calendar--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: EventType.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (event: EventType) => await RefArray.loadAll(event.links ?? []),
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
            objectSchema: MailboxType,
            getIntent: (_, options) => createIntent(InboxAction.CreateMailbox, { spaceId: options.space.id }),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: ContactsType,
            getIntent: () => createIntent(InboxAction.CreateContacts),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: CalendarType,
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
      id: `${meta.id}/module/artifact-definition`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: ArtifactDefinition,
    }),
  ]);
