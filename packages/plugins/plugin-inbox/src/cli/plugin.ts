//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Events, Plugin, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { meta } from '../meta';
import { Calendar, InboxAction, Mailbox } from '../types';

// TODO(wittjosiah): Factor out shared modules.
export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
        Calendar.Calendar,
        Event.Event,
        Mailbox.Mailbox,
        Message.Message,
      ]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [
      Capability.contributes(Capabilities.Metadata, {
        id: Mailbox.Mailbox.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateMailbox, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Calendar.Calendar.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateCalendar, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    ],
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: Capability.lazy('IntentResolver', () => import('../capabilities/intent-resolver')),
  }),
  Plugin.make,
);
