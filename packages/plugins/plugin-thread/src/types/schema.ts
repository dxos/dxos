//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';
import { MessageType } from '@dxos/schema-common';

export const ThreadStatus = S.Union(S.Literal('staged'), S.Literal('active'), S.Literal('resolved'));

export class ThreadType extends TypedObject({ typename: 'dxos.org/type/Thread', version: '0.1.0' })({
  name: S.optional(S.String),
  /** E.g., Document, Table, etc. */
  reference: S.optional(Ref(Expando)),
  /** AM cursor-range: 'from:to'. */
  anchor: S.optional(S.String),
  status: S.optional(ThreadStatus),
  messages: S.mutable(S.Array(Ref(MessageType))),
}) {}

export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: S.optional(S.String),
  threads: S.mutable(S.Array(Ref(ThreadType))),
}) {}
