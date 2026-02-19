//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { AiSession, GenericToolkit, ToolExecutionServices } from '@dxos/assistant';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest } from '@dxos/functions-runtime/testing';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Actor, LegacyOrganization, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { contextQueueLayerFromResearchGraph } from '../../blueprints/research/functions/research-graph';
import { makeGraphWriterHandler, makeGraphWriterToolkit } from '../../crud';

export default defineFunction({
  key: 'dxos.org/functions/entity-extraction',
  name: 'Entity Extraction',
  description: 'Extracts entities from emails and transcripts.',
  inputSchema: Schema.Struct({
    source: Message.Message.annotations({
      description: 'Email or transcript to extract entities from.',
    }),

    // TODO(dmaretskyi): Consider making this an array of blueprints instead.
    instructions: Schema.optional(Schema.String).annotations({
      description: 'Instructions extraction process.',
    }),
  }),
  outputSchema: Schema.Struct({
    entities: Schema.optional(
      Schema.Array(Type.Obj).annotations({
        description: 'Extracted entities.',
      }),
    ),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { source: message, instructions } }) {
      const tags = Obj.getMeta(message)?.tags;
      const contact = yield* extractContact(message.sender, tags);
      let organization: Organization.Organization | null = null;

      if (contact && !contact.organization) {
        const created: DXN[] = [];
        const GraphWriterToolkit = makeGraphWriterToolkit({
          schema: [LegacyOrganization],
        }).pipe();
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
          prompt: JSON.stringify({ source: message, contact }),
          toolkit,
        });

        if (created.length > 1) {
          throw new Error('Multiple organizations created');
        } else if (created.length === 1) {
          organization = yield* Database.resolve(created[0], Organization.Organization);
          Obj.change(organization, (org) => {
            const meta = Obj.getMeta(org);
            meta.tags ??= [];
            meta.tags.push(...(tags ?? []));
          });
          Obj.change(contact, (c) => {
            c.organization = Ref.make(organization!);
          });
        }
      }

      return {
        entities: [contact, organization].filter(Predicate.isNotNullable),
      };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-sonnet-4-0'), // TODO(dmaretskyi): Extract.
        ToolExecutionServices,
      ).pipe(
        Layer.provide(
          // TODO(dmaretskyi): This should be provided by environment.
          Layer.mergeAll(GenericToolkit.providerEmpty, FunctionInvocationServiceLayerTest()),
        ),
      ),
    ),
  ),
});

const extractContact = Effect.fn('extractContact')(function* (actor: Actor.Actor, tags?: readonly string[]) {
  const name = actor.name;
  const email = actor.email;
  if (!email) {
    log.warn('email is required for contact extraction', { actor });
    return undefined;
  }

  const existingContacts = yield* Database.runQuery(Filter.type(Person.Person));

  // Check for existing contact
  // TODO(dmaretskyi): Query filter DSL - https://linear.app/dxos/issue/DX-541/filtercontains-should-work-with-partial-objects
  const existingContact = existingContacts.find((contact) =>
    contact.emails?.some((contactEmail) => contactEmail.value === email),
  );

  if (existingContact) {
    log.info('Contact already exists', { email, existingContact });
    return existingContact;
  }

  const newContact = Obj.make(Person.Person, {
    ...(tags ? { [Obj.Meta]: { tags: [...tags] } } : {}),
    emails: [{ value: email }],
  });
  yield* Database.add(newContact);

  if (name) {
    Obj.change(newContact, (c) => {
      c.fullName = name;
    });
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) {
    log.warn('Invalid email format, cannot extract domain', { email });
    return newContact;
  }

  log.info('extracted email domain', { emailDomain });

  const existingOrganisations = yield* Database.runQuery(Filter.type(Organization.Organization));
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
        log.warn('Error parsing website URL', {
          website: org.website,
          error: e,
        });
        return false;
      }
    }
    return false;
  });

  if (matchingOrg) {
    log.info('found matching organization', { organization: matchingOrg });
    Obj.change(newContact, (c) => {
      c.organization = Ref.make(matchingOrg);
    });
  }

  return newContact;
});
