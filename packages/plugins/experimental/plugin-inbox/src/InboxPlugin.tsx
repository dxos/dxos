//
// Copyright 2024 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

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
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateMailbox, props),
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--envelope--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: ContactsType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateContacts, props),
            placeholder: ['contacts title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--address-book--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: CalendarType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateCalendar, props),
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
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [MailboxType, ContactsType, CalendarType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
