//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/** `Channel.backend.kind` of a channel whose conversations are email threads, hosted by EDGE's email-service. */
export const BACKEND_KIND = 'org.dxos.channel.backend.email';

/** Who may mail the agent when the config names nobody; EDGE applies the same default. */
export const DEFAULT_ALLOWED_SENDERS: readonly string[] = ['braneframe.com', 'dxos.org'];

/** The address and who may write to it; the create-channel form and the channel's properties panel edit these. */
export const Properties = Schema.Struct({
  handle: Schema.String.annotate({
    title: 'Address',
    description: 'The part before the @: `kai` receives mail for kai@dx.pub.',
  }),
  displayName: Schema.optional(
    Schema.String.annotate({
      title: 'Display name',
      description: 'The sender name on the agent’s replies.',
    }),
  ),
  allowedSenders: Schema.Array(Schema.String).annotate({
    title: 'Allowed senders',
    description: 'Domains (dxos.org) and addresses (friend@gmail.com) whose mail reaches the agent; others bounce.',
  }),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * Config of an email-backed `Channel` (`Channel.backend.config`): the agent's address and its sender allowlist.
 * Connecting the channel claims the address on EDGE, which routes each email thread into its own chat of the agent.
 */
export class AgentEmail extends Type.makeObject<AgentEmail>(DXN.make('org.dxos.type.agent.email', '0.1.0'))(
  Properties.pipe(
    Annotation.LabelAnnotation.set(['handle']),
    Annotation.IconAnnotation.set({ icon: 'ph--envelope--regular', hue: 'amber' }),
  ),
) {}

export const instanceOf = (value: unknown): value is AgentEmail => Obj.instanceOf(AgentEmail, value);

export type MakeProps = Omit<Obj.MakeProps<typeof AgentEmail>, 'allowedSenders'> & {
  allowedSenders?: readonly string[];
};

/** Creates an email channel config; an empty allowlist takes {@link DEFAULT_ALLOWED_SENDERS}. */
export const make = ({ handle, allowedSenders, ...props }: MakeProps): AgentEmail =>
  Obj.make(AgentEmail, {
    ...props,
    handle: handle.trim().toLowerCase(),
    allowedSenders: [...(allowedSenders?.length ? allowedSenders : DEFAULT_ALLOWED_SENDERS)],
  });

/** Mirrors the EDGE email-service `MailboxStatus`, which every mailbox route answers with. */
export const MailboxStatus = Schema.Struct({
  handle: Schema.String,
  address: Schema.String,
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

export type MailboxStatus = Schema.Schema.Type<typeof MailboxStatus>;

/** EDGE route of an agent's mailbox. */
export const mailboxPath = (handle: string): string => `/email/mailboxes/${encodeURIComponent(handle)}`;
