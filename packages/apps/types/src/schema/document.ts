//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

import { MessageType } from './thread';

export class TextContent extends TypedObject({ typename: 'dxos.org/type/TextContent', version: '0.1.0' })({
  content: S.String,
}) {}

const CommentSchema = S.mutable(
  S.Struct({
    messages: S.mutable(S.Array(ref(MessageType))),
    cursor: S.optional(S.String),
  }),
);

export interface DocumentCommentType extends S.Schema.Type<typeof CommentSchema> {}

// TODO(wittjosiah): Rename? Doc?
export class DocumentType extends TypedObject({ typename: 'dxos.org/type/Document', version: '0.1.0' })({
  title: S.optional(S.String),
  content: ref(TextContent),
  comments: S.optional(S.mutable(S.Array(CommentSchema))),
}) {}
