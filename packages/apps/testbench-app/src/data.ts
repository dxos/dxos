//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

// TODO(burdon): [API] wildcard imports?
import * as E from '@dxos/echo-schema';
// TODO(burdon): Remove "ECHO" and "Object" from type name. Otherwise good.
import { EchoObjectSchema } from '@dxos/echo-schema';

// TODO(burdon): Errors logged: IndexServiceImpl#0 TypeError: process.hrtime.bigint is not a function

// TODO(burdon): [API]: Do we need this?
export class TextV0Type extends EchoObjectSchema({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

// TODO(burdon): [API]: extends feels a bit Frankenstein (get review from effect discord).
// TODO(burdon): FQ URIs for type names.
export class ItemType extends EchoObjectSchema({ typename: 'example.com/type/Item', version: '0.1.0' })({
  // TODO(burdon): [API]: Make props optional by default?
  done: S.optional(S.boolean),
  text: E.ref(TextV0Type),
  // content: S.optional(S.string),
}) {}
