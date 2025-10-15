//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Queue } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export class MailboxType extends TypedObject({
  typename: 'dxos.org/type/Mailbox',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue),
}) {}
