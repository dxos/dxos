//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import {
  contributes,
  Capabilities,
  createResolver,
  type PluginsContext,
  createIntent,
  chain,
} from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { QueueSubspaceTags, DXN } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { SpaceAction } from '@dxos/plugin-space/types';
import { TableAction } from '@dxos/plugin-table';
import { Filter, Ref } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { MessageType, Contact, Organization } from '@dxos/schema';

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
            queue: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()])),
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

        const { objects: existingContacts } = await space.db.query(Filter.schema(Contact)).run();

        // Check for existing contact
        const existingContact = existingContacts.find((contact) =>
          contact.emails?.some((contactEmail) => contactEmail.value === email),
        );

        if (existingContact) {
          log.info('Contact already exists', { email, existingContact });
          return;
        }

        const newContact = live(Contact, {
          emails: [{ value: email }],
        });

        if (name) {
          newContact.fullName = name;
        }

        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!emailDomain) {
          log.warn('Invalid email format, cannot extract domain', { email });
          space.db.add(newContact);
          return;
        }

        log.info('Extracted email domain', { emailDomain });

        const { objects: existingOrganisations } = await space.db.query(Filter.schema(Organization)).run();

        const matchingOrg = existingOrganisations.find((org) => {
          if (org.website) {
            try {
              const websiteDomain = new URL(org.website).hostname.toLowerCase();
              return (
                websiteDomain === emailDomain ||
                websiteDomain.endsWith(`.${emailDomain}`) ||
                emailDomain.endsWith(`.${websiteDomain}`)
              );
            } catch (e) {
              return false;
            }
          }
          return false;
        });

        if (matchingOrg) {
          log.info('Found matching organization', { organization: matchingOrg });
          newContact.organization = Ref.make(matchingOrg);
        }

        space.db.add(newContact);
        log.info('Contact extracted and added to space', { contact: newContact });

        const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
        const contactTable = tables.find((table) => {
          return table.view?.target?.query?.typename === Contact.typename;
        });

        if (!contactTable) {
          log.info('No table found for contacts, creating one.');
          return {
            intents: [
              pipe(
                createIntent(TableAction.Create, {
                  space,
                  name: 'Contacts',
                  typename: Contact.typename,
                }),
                chain(SpaceAction.AddObject, { target: space }),
              ),
            ],
          };
        }
      },
    }),
  ]);
