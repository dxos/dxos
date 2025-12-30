//
// Copyright 2025 DXOS.org
//

// import { Effect, pipe, Schema } from 'effect';

// import { createTool, ToolRegistry, ToolResult } from '@dxos/ai';

import * as Effect from 'effect/Effect';

import { type AnyIntentChain, Capability, Common, createIntent, createResolver } from '@dxos/app-framework';
// import { ArtifactId } from '@dxos/blueprints';
// import { getSpace } from '@dxos/client/echo';
// import { SequenceBuilder, compileSequence, DEFAULT_INPUT, ValueBag, ComputeGraphModel } from '@dxos/conductor';
// import { TestRuntime } from '@dxos/conductor/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
// import { runAndForwardErrors } from '@dxos/effect';
// import { AiService, Database.Service, QueueService, ServiceContainer, ToolResolverService } from '@dxos/functions';
// import { failedInvariant } from '@dxos/invariant';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Organization, Person } from '@dxos/types';

import { Calendar, InboxAction, Mailbox } from '../../types';

// TODO(dmaretskyi): Circular dep due to the assistant stories
// import { AssistantCapabilities } from '@dxos/plugin-assistant';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.IntentResolver, [
      createResolver({
        intent: InboxAction.CreateMailbox,
        resolve: ({ db, name }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          return {
            data: { object: Mailbox.make({ name, space }) },
          };
        },
      }),
      createResolver({
        intent: InboxAction.CreateCalendar,
        resolve: ({ db, name }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          return {
            data: { object: Calendar.make({ space, name }) },
          };
        },
      }),
      createResolver({
        intent: InboxAction.ExtractContact,
        // TODO(burdon): Factor out function (and test separately).
        // TODO(burdon): Reconcile with dxos.org/functions/entity-extraction
        resolve: async ({ db, actor }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');

          log.info('extract contact', { actor });
          const name = actor.name;
          const email = actor.email;
          if (!email) {
            log.warn('email is required for contact extraction', { actor });
            return;
          }

          const existingContacts = await db.query(Filter.type(Person.Person)).run();

          // Check for existing contact
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
            newContact.fullName = name;
          }

          const emailDomain = email.split('@')[1]?.toLowerCase();
          if (!emailDomain) {
            log.warn('Invalid email format, cannot extract domain', { email });
            return {
              intents: [
                createIntent(SpaceAction.AddObject, {
                  object: newContact,
                  target: db,
                  hidden: true,
                }),
              ],
            };
          }

          log.info('extracted email domain', { emailDomain });
          const existingOrganisations = await db.query(Filter.type(Organization.Organization)).run();
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
            newContact.organization = Ref.make(matchingOrg);
          }

          const intents: AnyIntentChain[] = [];
          if (!space.properties.staticRecords.includes(Person.Person.typename)) {
            log.info('adding record type for contacts');
            intents.push(
              createIntent(SpaceAction.UseStaticSchema, {
                db,
                typename: Person.Person.typename,
              }),
            );
          }

          intents.push(
            createIntent(SpaceAction.AddObject, {
              object: newContact,
              target: db,
              hidden: true,
            }),
          );
          return { intents };
        },
      }),
      // TODO(dmaretskyi): There should be a generic execute{function/sequence/workflow} intent that runs the executable locally or remotelly.
      createResolver({
        intent: InboxAction.RunAssistant,
        resolve: async ({ mailbox }) => {
          throw new Error('Not implemented');

          // log.info('Run assistant', { mailbox });
          // const space = getSpace(mailbox) ?? failedInvariant();
          // const aiClient = null as any; // context.getCapability(AssistantCapabilities.AiClient);
          // const serviceContainer = new ServiceContainer().setServices({
          //   ai: AiService.AiService.make(aiClient.value),
          //   database: Database.Service.make(space.db),
          //   queues: QueueService.make(space.queues, undefined),
          //   // eventLogger: consoleLogger,
          //   toolResolver: ToolResolverService.make(
          //     // TODO(dmaretskyi): Provided by a plugin.
          //     new ToolRegistry([
          //       createTool('inbox', {
          //         name: 'label',
          //         description: 'Label a message',
          //         schema: Schema.Struct({
          //           message: ArtifactId.annotations({ description: 'The message to label' }),
          //           labels: Schema.Array(Label).annotations({ description: 'The labels to apply to the message' }),
          //         }),
          //         execute: async ({ message, labels }) => {
          //           log.info('Labeling message', { message, labels });
          //           return ToolResult.Success({
          //             message: 'Message labeled',
          //           });
          //         },
          //       }),
          //     ]),
          //   ),
          // });

          // const circuit = await compileSequence(SEQUENCE);

          // // TODO(dmaretskyi): We shouldn't really use test-runtime here but thats the most convinient api.
          // // Lets imporve the workflow-loader api.
          // const runtime = new TestRuntime(serviceContainer);
          // runtime.registerGraph('dxn:compute:test', new ComputeGraphModel(circuit));

          // // TODO(dmaretskyi): This should iterate over every message.

          // const input = 'TODO';
          // const { text } = await Function.pipe(
          //   { [DEFAULT_INPUT]: input },
          //   ValueBag.make,
          //   (input) => runtime.runGraph('dxn:compute:test', input),
          //   Effect.flatMap(ValueBag.unwrap),
          //   Effect.scoped,
          //   runAndForwardErrors,
          // );

          // log.info('Workflow result', { text });
        },
      }),
    ]),
  ),
);

// const Label = Schema.Literal('important', 'personal', 'work', 'social', 'promotions', 'updates', 'forums', 'spam');

// const SEQUENCE = SequenceBuilder.create()
//   .step('Analyze the email and assign labels to it', {
//     tools: ['inbox/label'],
//   })
//   .build());
