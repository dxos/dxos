//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation, OperationResolver } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Collection } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { Calendar, InboxOperation, Mailbox } from '../../types';
import { buildDraftMessageProps } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: InboxOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const mailboxCollection = Collection.makeManaged({ key: Mailbox.Mailbox.typename });
          const calendarCollection = Collection.makeManaged({ key: Calendar.Calendar.typename });
          const messageCollection = Collection.makeManaged({ key: Message.Message.typename });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(mailboxCollection), Ref.make(calendarCollection), Ref.make(messageCollection));
          });
        }),
      }),
      OperationResolver.make({
        operation: InboxOperation.ExtractContact,
        handler: Effect.fnUntraced(function* ({ db, actor }) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');

          log.info('extract contact', { actor });
          const name = actor.name;
          const email = actor.email;
          if (!email) {
            log.warn('email is required for contact extraction', { actor });
            return;
          }

          const existingContacts = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());

          const existingContact = existingContacts.find((contact) =>
            contact.emails?.some((contactEmail) => contactEmail.value === email),
          );
          if (existingContact) {
            log.info('Contact already exists', { email, existingContact });
            return;
          }

          const newContact = Obj.make(Person.Person, {
            emails: [{ value: email }],
          });
          if (name) {
            Obj.change(newContact, (c) => {
              c.fullName = name;
            });
          }

          const emailDomain = email.split('@')[1]?.toLowerCase();
          if (!emailDomain) {
            log.warn('Invalid email format, cannot extract domain', { email });
            yield* Operation.invoke(SpaceOperation.AddObject, {
              object: newContact,
              target: db,
              hidden: true,
            });
            return;
          }

          log.info('extracted email domain', { emailDomain });
          const existingOrganisations = yield* Effect.promise(() =>
            db.query(Filter.type(Organization.Organization)).run(),
          );
          const matchingOrg = existingOrganisations.find((org) => {
            if (org.website) {
              try {
                const websiteUrl =
                  org.website.startsWith('http://') || org.website.startsWith('https://')
                    ? org.website
                    : `https://${org.website}`;

                const websiteDomain = new URL(websiteUrl).hostname.toLowerCase();
                return (
                  websiteDomain === emailDomain ||
                  websiteDomain.endsWith(`.${emailDomain}`) ||
                  emailDomain.endsWith(`.${websiteDomain}`)
                );
              } catch (err) {
                log.warn('parsing website URL', {
                  website: org.website,
                  error: err,
                });
                return false;
              }
            }
            return false;
          });

          if (matchingOrg) {
            log.info('found matching organization', {
              organization: matchingOrg,
            });
            Obj.change(newContact, (c) => {
              c.organization = Ref.make(matchingOrg);
            });
          }

          if (!space.properties.staticRecords.includes(Person.Person.typename)) {
            log.info('adding record type for contacts');
            yield* Operation.invoke(SpaceOperation.UseStaticSchema, {
              db,
              typename: Person.Person.typename,
            });
          }

          yield* Operation.invoke(SpaceOperation.AddObject, {
            object: newContact,
            target: db,
            hidden: true,
          });
        }),
      }),
      OperationResolver.make({
        operation: InboxOperation.CreateDraft,
        handler: Effect.fnUntraced(function* ({ db, mode, replyToMessage, subject, body }) {
          const props = buildDraftMessageProps({
            mode,
            replyToMessage: replyToMessage as Message.Message | undefined,
            subject,
            body,
          });
          const draft = Obj.make(Message.Message, props);
          yield* Operation.invoke(SpaceOperation.AddObject, {
            object: draft,
            target: db,
            hidden: true,
          });
          yield* Operation.invoke(LayoutOperation.Open, {
            subject: [Obj.getDXN(draft).toString()],
          });
        }),
      }),
    ]);
  }),
);
