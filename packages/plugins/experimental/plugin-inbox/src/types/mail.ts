//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { ref, TypedObject } from '@dxos/echo-schema';
import { MessageType } from '@dxos/plugin-space';

export class MailboxType extends TypedObject({ typename: 'dxos.org/type/MailboxType', version: '0.1.0' })({
  name: S.optional(S.String),
  messages: S.mutable(S.Array(ref(MessageType))),
}) {}
