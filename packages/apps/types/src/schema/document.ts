//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Temporary?
export class TextV0Type extends TypedObject({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

const CommentSchema = S.mutable(
  S.struct({
    thread: S.optional(E.ref(E.ExpandoType)),
    cursor: S.optional(S.string),
  }),
);

export interface DocumentCommentType extends S.Schema.Type<typeof CommentSchema> {}

export class DocumentType extends TypedObject({ typename: 'braneframe.Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: E.ref(TextV0Type),
  comments: S.optional(S.mutable(S.array(CommentSchema))),
}) {}
