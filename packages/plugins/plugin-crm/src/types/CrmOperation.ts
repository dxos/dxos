//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation, Trace } from '@dxos/compute';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import * as ProfileOf from './ProfileOf';

/**
 * Downloads an external image URL, uploads it to the DXOS image service, and
 * writes the returned canonical URL onto the subject's `image` field.
 * Mirrors the behaviour of composer-crx `createThumbnail`.
 */
export const AttachImage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.plugin-crm.attachImage'),
    name: 'Attach image',
    icon: 'ph--image--regular',
    description: trim`
      Downloads an external image URL and stores it on the DXOS image service,
      then writes the canonical URL onto the subject's \`image\` field.
      Use this after you have already identified a candidate avatar, logo, or
      photograph for a Person or Organization via web research.
    `,
  },
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotations({
      description: 'Reference to the Person or Organization whose `image` field should be set.',
    }),
    url: Schema.String.annotations({
      description: 'External image URL. Must be a JPEG, PNG, WebP, or GIF.',
    }),
    imageServiceUrl: Schema.optional(
      Schema.String.annotations({
        description: 'Override for the image service base URL. Defaults to the value configured for the runtime.',
      }),
    ),
  }),
  output: Schema.Struct({
    imageUrl: Schema.String.annotations({
      description: 'Canonical URL returned by the DXOS image service.',
    }),
  }),
  services: [Database.Service, Trace.TraceService],
});

/**
 * Deterministic profile scaffolding for a Person: creates a markdown Profile document pre-filled
 * from known ECHO data and links it via a `ProfileOf` relation. Re-runs refresh
 * `lastResearchedAt` without regenerating the document body (which is user/agent-owned after
 * creation). Content enrichment (web research, dossier writing) is the agentic path composed from
 * research sources — this operation owns structure and provenance only.
 */
export const ResearchPerson = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.plugin-crm.researchPerson'),
    name: 'Research person',
    icon: 'ph--user-focus--regular',
    description: trim`
      Creates (or refreshes) the Profile document for a Person and links it via a ProfileOf
      relation. The document is a structured skeleton pre-filled from known data; extend its
      sections with researched content rather than creating a separate document.
    `,
  },
  input: Schema.Struct({
    subject: Ref.Ref(Person.Person).annotations({
      description: 'The Person to profile.',
    }),
  }),
  output: Schema.Struct({
    profile: Ref.Ref(Markdown.Document).annotations({
      description: 'The Profile document linked to the subject.',
    }),
    created: Schema.Boolean.annotations({
      description: 'True when a new Profile document was created; false when one already existed.',
    }),
  }),
  types: [Markdown.Document, ProfileOf.ProfileOf],
  services: [Database.Service],
});

/**
 * Deterministic profile scaffolding for an Organization; see {@link ResearchPerson}.
 */
export const ResearchOrganization = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.plugin-crm.researchOrganization'),
    name: 'Research organization',
    icon: 'ph--buildings--regular',
    description: trim`
      Creates (or refreshes) the Profile document for an Organization and links it via a ProfileOf
      relation. The document is a structured skeleton pre-filled from known data; extend its
      sections with researched content rather than creating a separate document.
    `,
  },
  input: Schema.Struct({
    subject: Ref.Ref(Organization.Organization).annotations({
      description: 'The Organization to profile.',
    }),
  }),
  output: Schema.Struct({
    profile: Ref.Ref(Markdown.Document).annotations({
      description: 'The Profile document linked to the subject.',
    }),
    created: Schema.Boolean.annotations({
      description: 'True when a new Profile document was created; false when one already existed.',
    }),
  }),
  types: [Markdown.Document, ProfileOf.ProfileOf],
  services: [Database.Service],
});

export const DEFAULT_PROCESS_MAILBOX_PAGE_SIZE = 20;

/**
 * Cursored CRM pipeline over a mailbox's message feed: extracts contacts for new messages past the
 * persisted feed cursor (same gate and identity dedup as mail sync), optionally scaffolding a
 * Profile per new contact. Idempotent — the cursor is a coarse skip and the space's identity index
 * is the precise backstop — so it is safe to fire per feed item from a trigger; each invocation
 * catches up and extra firings process nothing.
 */
export const ProcessMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.plugin-crm.processMailbox'),
    name: 'Process mailbox',
    icon: 'ph--address-book--regular',
    description: trim`
      Processes new messages in a mailbox for CRM: creates Person records for senders that pass
      the extraction gate (linking them to known Organizations by domain) and optionally scaffolds
      a Profile document per new contact. Tracks progress with a durable cursor against the
      mailbox's message feed: repeated runs re-examine at most the messages at the cursor boundary
      and never create duplicates.
    `,
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'The mailbox whose message feed should be processed.',
    }),
    pageSize: Schema.optional(
      Schema.Number.annotations({
        description: 'Messages per cursor-advance page (default 20).',
      }),
    ),
    research: Schema.optional(
      Schema.Boolean.annotations({
        description: 'When true, scaffold a Profile document for each new contact (default false).',
      }),
    ),
  }),
  output: Schema.Struct({
    processed: Schema.Number.annotations({
      description: 'Number of new messages examined this run.',
    }),
    contacts: Schema.Number.annotations({
      description: 'Number of Person records created this run.',
    }),
    profiles: Schema.Number.annotations({
      description: 'Number of Profile documents created this run.',
    }),
  }),
  types: [Person.Person, Organization.Organization],
  services: [Database.Service, Operation.Service],
});
