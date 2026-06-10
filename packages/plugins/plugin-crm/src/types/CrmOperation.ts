//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Trace, Operation } from '@dxos/compute';
import { Database, Obj, Ref, DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

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
 * Creates a CRM routine and feed trigger for the given mailbox.
 * On each new message in the mailbox's feed the trigger runs the routine,
 * which researches the sender/contacts and creates/updates CRM Profiles.
 *
 * This is a create-only operation — it does not repair or remove existing
 * partial state. "Configured" is detected separately by the companion hook.
 */
export const SetupMailboxCrm = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.plugin-crm.setupMailboxCrm'),
    name: 'Set up CRM routine',
    icon: 'ph--address-book--regular',
    description: trim`
      Creates a Routine and feed Trigger that runs the CRM blueprint for every
      new message in the mailbox. Call this once to configure a mailbox for
      automatic CRM profile creation.
    `,
  },
  input: Schema.Struct({
    mailboxUri: Schema.String.annotations({
      description: 'URI of the Mailbox to configure.',
    }),
  }),
  // Output is void; the created routine and trigger are discovered via useQuery.
  output: Schema.Void,
  services: [Database.Service, Trace.TraceService],
});
