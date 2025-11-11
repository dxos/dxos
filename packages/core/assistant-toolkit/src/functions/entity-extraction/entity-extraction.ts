//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { AiSession, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Filter, Obj, Ref } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest } from '@dxos/functions-runtime/testing';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { LegacyOrganization, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { makeGraphWriterHandler, makeGraphWriterToolkit } from '../../crud';
import { contextQueueLayerFromResearchGraph } from '../research';

export default defineFunction({
  key: 'dxos.org/functions/entity-extraction',
  name: 'Entity Extraction',
  description: 'Extracts entities from emails and transcripts.',
  inputSchema: Schema.Struct({
    source: Message.Message.annotations({ description: 'Email or transcript to extract entities from.' }),

    // TODO(dmaretskyi): Consider making this an array of blueprints instead.
    instructions: Schema.optional(Schema.String).annotations({ description: 'Instructions extraction process.' }),
  }),
  outputSchema: Schema.Struct({
    entities: Schema.optional(
      Schema.Array(Obj.Any).annotations({
        description: 'Extracted entities.',
      }),
    ),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { source, instructions } }) {
      const contact = yield* extractContact(source);
      let organization: Organization.Organization | null = null;

      if (contact && !contact.organization) {
        const created: DXN[] = [];
        const GraphWriterToolkit = makeGraphWriterToolkit({ schema: [LegacyOrganization] }).pipe();
        const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit, {
          onAppend: (dxns) => created.push(...dxns),
        });
        const toolkit = yield* GraphWriterToolkit.pipe(
          Effect.provide(GraphWriterHandler.pipe(Layer.provide(contextQueueLayerFromResearchGraph))),
        );

        yield* new AiSession().run({
          system: trim`
            Extract the sender's organization from the email. If you are not sure, do nothing.
            The extracted organization URL must match the sender's email domain.
            ${instructions ? '<user_intructions>' + instructions + '</user_intructions>' : ''},
          `,
          prompt: JSON.stringify({ source, contact }),
          toolkit,
        });

        if (created.length > 1) {
          throw new Error('Multiple organizations created');
        } else if (created.length === 1) {
          organization = yield* DatabaseService.resolve(created[0], Organization.Organization);
          Obj.getMeta(organization).tags ??= [];
          Obj.getMeta(organization).tags!.push(...(Obj.getMeta(source)?.tags ?? []));
          contact.organization = Ref.make(organization);
        }
      }

      return {
        entities: [contact, organization].filter(Predicate.isNotNullable),
      };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-sonnet-4-0'), // TODO(dmaretskyi): Extract.
        makeToolResolverFromFunctions([], Toolkit.make()),
        makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
      ).pipe(
        Layer.provide(
          // TODO(dmaretskyi): This should be provided by environment.
          Layer.mergeAll(FunctionInvocationServiceLayerTest()),
        ),
      ),
    ),
  ),
});

const extractContact = Effect.fn('extractContact')(function* (message: Message.Message) {
  const name = message.sender.name;
  const email = message.sender.email;
  if (!email) {
    log.warn('email is required for contact extraction', { sender: message.sender });
    return undefined;
  }

  const { objects: existingContacts } = yield* DatabaseService.runQuery(Filter.type(Person.Person));

  // Check for existing contact
  // TODO(dmaretskyi): Query filter DSL - https://linear.app/dxos/issue/DX-541/filtercontains-should-work-with-partial-objects
  const existingContact = existingContacts.find((contact) =>
    contact.emails?.some((contactEmail: any) => contactEmail.value === email),
  );

  if (existingContact) {
    log.info('Contact already exists', { email, existingContact });
    return existingContact;
  }

  const newContact = Obj.make(Person.Person, {
    [Obj.Meta]: {
      tags: Obj.getMeta(message)?.tags,
    },
    emails: [{ value: email }],
  });
  yield* DatabaseService.add(newContact);

  if (name) {
    newContact.fullName = name;
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) {
    log.warn('Invalid email format, cannot extract domain', { email });
    return newContact;
  }

  log.info('extracted email domain', { emailDomain });

  const { objects: existingOrganisations } = yield* DatabaseService.runQuery(Filter.type(Organization.Organization));
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

  return newContact;
});
