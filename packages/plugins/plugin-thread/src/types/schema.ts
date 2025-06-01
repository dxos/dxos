//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Ref, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';

export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  defaultThread: Ref(ThreadType),
  // TODO(wittjosiah): Should be an "ordered collection".
  threads: Schema.mutable(Schema.Array(Ref(ThreadType))),
}) {}
