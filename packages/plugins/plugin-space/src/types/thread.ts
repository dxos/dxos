//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

// TODO(wittjosiah): These types were placed here rather than in @dxos/plugin-thread
//   in order to avoid a circular dependency between threads and other objects that use threads.

export const ThreadStatus = S.Union(S.Literal('staged'), S.Literal('active'), S.Literal('resolved'));

export class ThreadType extends TypedObject({ typename: 'dxos.org/type/Thread', version: '0.1.0' })({
  name: S.optional(S.String),
  /** AM cursor-range: 'from:to'. */
  anchor: S.optional(S.String),
  status: S.optional(ThreadStatus),
  messages: S.mutable(S.Array(Ref(DataType.Message))),
}) {}

export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: S.optional(S.String),
  queue: Ref(Expando),
}) {}
