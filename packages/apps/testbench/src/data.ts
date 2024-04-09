//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

// TODO(burdon): [API]: Do we need this?
export class TextV0Type extends EchoObjectSchema({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

// TODO(burdon): [API]: Frankenstein (get review from effect discord).
// TODO(burdon): FQ URIs for type names.
export class ItemType extends EchoObjectSchema({ typename: 'example.com/type/Item', version: '0.1.0' })({
  done: S.optional(S.boolean),
  text: E.ref(TextV0Type),
}) {}
