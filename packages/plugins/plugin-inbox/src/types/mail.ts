//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export class MailboxType extends TypedObject({ typename: 'dxos.org/type/Mailbox', version: '0.1.0' })({
  name: S.optional(S.String),
  queue: Ref(Expando),
}) {}
