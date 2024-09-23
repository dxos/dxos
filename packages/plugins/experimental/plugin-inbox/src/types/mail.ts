//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export enum EmailState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2, // TODO(burdon): Actually delete (need sync range so that doesn't return).
  SPAM = 3,
}

export class MailboxType extends TypedObject({ typename: 'dxos.org/type/MailboxType', version: '0.1.0' })({
  name: S.optional(S.String),
  messages: S.mutable(S.Array(ref(Expando))),
}) {}
