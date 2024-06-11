//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

import { ThreadType } from './thread';

export class TextType extends TypedObject({ typename: 'dxos.org/type/Text', version: '0.1.0' })({
  content: S.String,
}) {}

export class DocumentType extends TypedObject({ typename: 'dxos.org/type/Document', version: '0.1.0' })({
  name: S.optional(S.String),
  content: ref(TextType),
  threads: S.optional(S.mutable(S.Array(ThreadType))),
}) {}
