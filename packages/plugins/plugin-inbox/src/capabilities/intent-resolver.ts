//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginsContext } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { QueueSubspaceTags, DXN } from '@dxos/keys';
import { live, refFromDXN } from '@dxos/live-object';
import { MessageType, Contact, Organization } from '@dxos/schema';

import { InboxCapabilities } from './capabilities';
import { CalendarType, InboxAction, MailboxType } from '../types';
import { log } from '@dxos/log';
import { Filter } from '@dxos/client/echo';

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
    createResolver({
      intent: InboxAction.ExtractContact,
      resolve: async ({ space, message }) => {
        log.info('Extract contact', { message });
        const email = message.sender.email;
        const name = message.sender.name;

        if (!email) {
          log.warn('Email is required for contact extraction', { sender: message.sender });
          return;
        }

        const existingContacts = await space.db.query(Filter.schema(Contact)).run();

        // TODO(ZaymonFC): Check for existing contact.

        const newContact = live(Contact, {
          emails: [{ value: email }],
        });

        if (name) {
          newContact.fullName = name;
        }

        // Try find organisation
        const { objects: existingOrganisations } = await space.db.query(Filter.schema(Organization)).run();
        const organisation = existingOrganisations.find((org) => org.website === email);

        space.db.add(newContact);
      },
    }),
  ]);
