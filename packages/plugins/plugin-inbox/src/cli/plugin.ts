//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin, lazy } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { meta } from '../meta';
import { Calendar, InboxAction, Mailbox } from '../types';

// TODO(wittjosiah): Factor out shared modules.
export const InboxPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(ClientCapabilities.Schema, [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message]),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [
      contributes(Capabilities.Metadata, {
        id: Mailbox.Mailbox.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateMailbox, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Calendar.Calendar.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateCalendar, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: lazy(() => import('../capabilities/intent-resolver')),
  }),
]);
