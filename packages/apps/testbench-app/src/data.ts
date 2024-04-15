//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '@dxos/echo-schema';

// TODO(burdon): [API]: extends feels a bit Frankenstein (get review from effect discord).
// TODO(burdon): FQ URIs for type names.
export class ItemType extends TypedObject({ typename: 'example.com/type/Item', version: '0.1.0' })({
  // TODO(burdon): [API]: Make props optional by default?
  done: S.optional(S.boolean),
  content: S.optional(S.string),
  // TODO(burdon): [API]: Are dates supported?
  //  TypeError: Method Date.prototype.toString called on incompatible receiver [object Object]
  // due: S.optional(S.Date),
}) {}

export class DocumentType extends TypedObject({ typename: 'example.com/type/Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: S.optional(S.string),
}) {}
