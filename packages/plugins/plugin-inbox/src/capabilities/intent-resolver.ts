//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginsContext } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { QueueSubspaceTags, DXN } from '@dxos/keys';
import { live, refFromDXN } from '@dxos/live-object';
import { MessageType } from '@dxos/schema';

import { InboxCapabilities } from './capabilities';
import { CalendarType, InboxAction, MailboxType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: InboxAction.CreateMailbox,
      resolve: ({ spaceId, name }) => ({
        data: {
          object: live(MailboxType, {
            name,
            queue: refFromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()])),
          }),
        },
      }),
    }),
    createResolver({
      intent: InboxAction.CreateCalendar,
      resolve: () => ({
        data: { object: live(CalendarType, {}) },
      }),
    }),
    createResolver({
      intent: InboxAction.SelectMessage,
      resolve: ({ mailboxId, message }) => {
        const state = context.requestCapability(InboxCapabilities.MutableMailboxState);
        if (message) {
          // TODO(wittjosiah): Static to live object fails.
          //  Needs to be a live object because graph is live and the current message is included in the companion.
          const { '@type': _, id, ...messageWithoutType } = { ...message } as any;
          const liveMessage = live(MessageType, messageWithoutType);
          liveMessage.id = id;
          state[mailboxId] = liveMessage;
        } else {
          delete state[mailboxId];
        }
      },
    }),
  ]);
