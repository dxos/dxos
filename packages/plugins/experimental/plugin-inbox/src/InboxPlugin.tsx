//
// Copyright 2024 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { RefArray } from '@dxos/live-object';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { INBOX_PLUGIN, meta } from './meta';
import translations from './translations';
import { CalendarType, ContactsType, EventType, InboxAction, MailboxType } from './types';

export const InboxPlugin = () =>
  definePlugin(meta, [
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
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--envelope--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: ContactsType.typename,
          metadata: {
            placeholder: ['contacts title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--address-book--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: CalendarType.typename,
          metadata: {
            placeholder: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
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
            getIntent: () => createIntent(InboxAction.CreateMailbox),
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
