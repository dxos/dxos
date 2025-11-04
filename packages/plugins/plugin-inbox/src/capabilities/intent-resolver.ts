//
// Copyright 2025 DXOS.org
//

// import { Effect, pipe, Schema } from 'effect';

// import { createTool, ToolRegistry, ToolResult } from '@dxos/ai';

import {
  type AnyIntentChain,
  Capabilities,
  type PluginContext,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
// import { ArtifactId } from '@dxos/blueprints';
// import { getSpace } from '@dxos/client/echo';
// import { SequenceBuilder, compileSequence, DEFAULT_INPUT, ValueBag, ComputeGraphModel } from '@dxos/conductor';
// import { TestRuntime } from '@dxos/conductor/testing';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
// import { runAndForwardErrors } from '@dxos/effect';
// import { AiService, DatabaseService, QueueService, ServiceContainer, ToolResolverService } from '@dxos/functions';
// import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { SpaceAction } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

import { Calendar, InboxAction, Mailbox } from '../types';

import { InboxCapabilities } from './capabilities';

// TODO(dmaretskyi): Circular dep due to the assistant stories
// import { AssistantCapabilities } from '@dxos/plugin-assistant';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: InboxAction.CreateMailbox,
      resolve: ({ space, name }) => ({
        data: { object: Mailbox.make({ name, space }) },
      }),
    }),
    createResolver({
      intent: InboxAction.CreateCalendar,
      resolve: () => ({
        data: { object: Calendar.make() },
      }),
    }),
    createResolver({
      intent: InboxAction.SelectMessage,
      resolve: ({ mailboxId, message }) => {
        const state = context.getCapability(InboxCapabilities.MutableMailboxState);
        if (message) {
          // TODO(wittjosiah): Static to live object fails.
          //  Needs to be a live object because graph is live and the current message is included in the companion.
          const { '@type': _, ...messageWithoutType } = { ...message } as any;
          const liveMessage = Obj.make(DataType.Message, messageWithoutType);
          state[mailboxId] = liveMessage;
        } else {
          delete state[mailboxId];
        }
      },
    }),
    createResolver({
      intent: InboxAction.ExtractContact,
      resolve: async ({ space, message }) => {
        log.info('extract contact', { message });
        const name = message.sender.name;
        const email = message.sender.email;
        if (!email) {
          log.warn('email is required for contact extraction', { sender: message.sender });
          return;
        }

        const { objects: existingContacts } = await space.db.query(Filter.type(DataType.Person.Person)).run();

        // Check for existing contact
        const existingContact = existingContacts.find((contact) =>
          contact.emails?.some((contactEmail) => contactEmail.value === email),
        );

        if (existingContact) {
          log.info('Contact already exists', { email, existingContact });
          return;
        }

        const newContact = Obj.make(DataType.Person.Person, {
          emails: [{ value: email }],
        });

        if (name) {
          newContact.fullName = name;
        }

        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!emailDomain) {
          log.warn('Invalid email format, cannot extract domain', { email });
          return {
            intents: [createIntent(SpaceAction.AddObject, { object: newContact, target: space, hidden: true })],
          };
        }

        log.info('extracted email domain', { emailDomain });

        const { objects: existingOrganisations } = await space.db
          .query(Filter.type(DataType.Organization.Organization))
          .run();
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
            } catch (e) {
              log.warn('Error parsing website URL', { website: org.website, error: e });
              return false;
            }
          }
          return false;
        });

        if (matchingOrg) {
          log.info('found matching organization', { organization: matchingOrg });
          newContact.organization = Ref.make(matchingOrg);
        }

        const intents: AnyIntentChain[] = [];
        if (!space.properties.staticRecords.includes(Type.getTypename(DataType.Person.Person))) {
          log.info('adding record type for contacts');
          intents.push(
            createIntent(SpaceAction.UseStaticSchema, {
              space,
              typename: Type.getTypename(DataType.Person.Person),
            }),
          );
        }

        intents.push(createIntent(SpaceAction.AddObject, { object: newContact, target: space, hidden: true }));

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
        //   database: DatabaseService.make(space.db),
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
  ]);

// const Label = Schema.Literal('important', 'personal', 'work', 'social', 'promotions', 'updates', 'forums', 'spam');

// const SEQUENCE = SequenceBuilder.create()
//   .step('Analyze the email and assign labels to it', {
//     tools: ['inbox/label'],
//   })
//   .build();
