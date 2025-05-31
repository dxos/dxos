//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Ref, TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

// TODO(wittjosiah): These types were placed here rather than in @dxos/plugin-thread
//   in order to avoid a circular dependency between threads and other objects that use threads.

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

export class ThreadType extends TypedObject({ typename: 'dxos.org/type/Thread', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  messages: Schema.mutable(Schema.Array(Ref(DataType.Message))),
  // TODO(wittjosiah): Factor out to a relation.
  /** AM cursor-range: 'from:to'. */
  anchor: Schema.optional(Schema.String),
  status: Schema.optional(ThreadStatus),
}) {}
