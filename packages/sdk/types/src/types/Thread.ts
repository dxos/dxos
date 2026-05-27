//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';

import * as Message from './Message';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

/** Per-thread agent firing policy. */
export const AgentMode = Schema.Union(Schema.Literal('auto'), Schema.Literal('mention'));
export type AgentMode = Schema.Schema.Type<typeof AgentMode>;

/**
 * Per-thread AI agent configuration.
 *
 * Stored as an optional field on Thread. The agent's identity (display name,
 * DID) is deliberately NOT stored here — it is resolved at runtime via the
 * AgentIdentity Effect service so that renaming the agent globally affects
 * past threads too.
 */
export const AgentConfig = Schema.Struct({
  enabled: Schema.Boolean,
  mode: AgentMode,
});
export interface AgentConfig extends Schema.Schema.Type<typeof AgentConfig> {}

/**
 * ECHO-backed message thread.
 */
export const Thread = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  status: ThreadStatus.pipe(Schema.optional),
  messages: Schema.Array(Ref.Ref(Message.Message)),
  agent: Schema.optional(AgentConfig),
}).pipe(Type.object(DXN.make('org.dxos.type.thread', '0.2.0')), SystemTypeAnnotation.set(true));

export interface Thread extends Schema.Schema.Type<typeof Thread> {}

export const make = ({
  status = 'staged',
  messages = [],
  ...props
}: Partial<Obj.MakeProps<typeof Thread>> = {}): Thread => Obj.make(Thread, { status, messages, ...props });
