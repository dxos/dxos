//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';

import * as Mailbox from './Mailbox.ts';

/**
 * The provider-agnostic reply-drafting contract. Whoever generates replies takes this input and returns
 * this output, so the message surfaces can offer an AI reply without naming the plugin that grounds it
 * (see `InboxCapabilities.ReplyGenerator`).
 *
 * The contract lives here rather than with the generator because plugin-inbox owns the Mailbox and the
 * surfaces that call it, and the dependency runs the other way — a generator plugin depends on inbox.
 */
export const Input = Schema.Struct({
  mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
    description: 'Mailbox whose feed holds the thread.',
  }),
  message: Schema.Any.annotate({
    description: 'The message to reply to.',
  }),
});

export type Input = Schema.Schema.Type<typeof Input>;

export const Output = Schema.Struct({
  subject: Schema.String,
  body: Schema.String,
});

export type Output = Schema.Schema.Type<typeof Output>;
