//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { meta } from '../meta';
import { Calendar, InboxAction, Mailbox } from '../types';

// TODO(wittjosiah): Factor out shared modules.
export const InboxPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSchemaModule({
    schema: [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message],
  }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.Mailbox.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateMailbox, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateCalendar, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  Common.Plugin.addIntentResolverModule({
    activate: Capability.lazy('IntentResolver', () => import('../capabilities/intent-resolver/intent-resolver')),
  }),
  Plugin.make,
);
