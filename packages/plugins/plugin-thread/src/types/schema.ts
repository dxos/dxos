//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Ref, TypedObject, Expando } from '@dxos/echo-schema';

// TODO(wittjosiah): Factor out to @dxos/schema?
//   Channel vs Thread?
//   Arrays vs Queues?
export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  queue: Ref(Expando),
}) {}
