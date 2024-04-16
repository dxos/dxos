//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Temporary?
export class TextV0Type extends TypedObject({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

const CommentSchema = S.mutable(
  S.struct({
    thread: S.optional(ref(Expando)),
    cursor: S.optional(S.string),
  }),
);

export interface DocumentCommentType extends S.Schema.Type<typeof CommentSchema> {}

export class DocumentType extends TypedObject({ typename: 'braneframe.Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: ref(TextV0Type),
  comments: S.optional(S.mutable(S.array(CommentSchema))),
}) {}
