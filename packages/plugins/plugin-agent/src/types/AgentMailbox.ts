//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

/**
 * Agent mailboxes on EDGE: a handle (`kai` for `kai@dxos.ai`) bound to the agent that answers its mail. The email
 * channel backend works through {@link AgentMailboxService}; where it reaches EDGE is the layer's business.
 */

export class AgentMailboxError extends BaseError.extend('AgentMailboxError', 'Agent mailbox request failed.') {}

/** A mailbox as EDGE's compute-service reports it (`MailboxStatus`), after every claim, release or read. */
export const MailboxStatus = Schema.Struct({
  handle: Schema.String,
  address: Schema.String,
  /** Absent while nobody holds the handle. */
  config: Schema.optional(
    Schema.Struct({
      spaceId: Schema.String,
      agent: Schema.String,
      channel: Schema.String,
      allowedSenders: Schema.Array(Schema.String),
    }),
  ),
  threads: Schema.Number,
  pending: Schema.Number,
  received: Schema.Number,
  rejected: Schema.Number,
  sent: Schema.Number,
  lastError: Schema.optional(Schema.String),
});

export interface MailboxStatus extends Schema.Schema.Type<typeof MailboxStatus> {}

export type ClaimRequest = {
  readonly handle: string;
  readonly spaceId: string;
  /** EID of the agent that answers the mailbox. */
  readonly agent: string;
  /** EID of the `Channel` its conversations belong to. */
  readonly channel: string;
  /** Sender name on the agent's replies. */
  readonly displayName?: string;
  /** Domains and addresses whose mail reaches the agent; EDGE bounces everyone else. */
  readonly allowedSenders: readonly string[];
};

/** An email the agent sends from its mailbox. */
export type SendRequest = {
  readonly handle: string;
  readonly spaceId: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  /** The thread token of a conversation it continues (its headers keep the mail in that thread). */
  readonly thread?: string;
  /**
   * Refuse a recipient who never wrote to the mailbox. Set unless the space knows the recipient as a contact: EDGE
   * keeps who wrote to it, the space keeps its contacts, so each checks its half.
   */
  readonly correspondentOnly: boolean;
};

export const SendResult = Schema.Struct({
  messageId: Schema.String,
  thread: Schema.String,
});

export interface SendResult extends Schema.Schema.Type<typeof SendResult> {}

export interface Service {
  /** Binds the handle to the agent, or updates the binding the space already holds; fails when another space holds it. */
  readonly claim: (request: ClaimRequest) => Effect.Effect<MailboxStatus, AgentMailboxError>;
  /** Releases the handle; mail to it bounces from then on. */
  readonly release: (handle: string) => Effect.Effect<MailboxStatus, AgentMailboxError>;
  /** None while the EDGE it reaches has no mailboxes (an older deployment): email is unavailable, not failing. */
  readonly status: (handle: string) => Effect.Effect<Option.Option<MailboxStatus>, AgentMailboxError>;
  /** Sends an email from the mailbox. */
  readonly send: (request: SendRequest) => Effect.Effect<SendResult, AgentMailboxError>;
}

export class AgentMailboxService extends Context.Service<AgentMailboxService, Service>()(
  '@dxos/plugin-agent/AgentMailboxService',
) {}
