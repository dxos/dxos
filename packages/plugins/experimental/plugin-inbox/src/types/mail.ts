//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { MessageType } from '@dxos/schema';

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export class MailboxType extends TypedObject({ typename: 'dxos.org/type/MailboxType', version: '0.1.0' })({
  name: S.optional(S.String),
  messages: S.mutable(S.Array(Ref(MessageType))),
}) {}
