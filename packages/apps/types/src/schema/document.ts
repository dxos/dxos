//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class TextV0Type extends EchoObjectSchema({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

export class DocumentType extends EchoObjectSchema({ typename: 'braneframe.Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: E.ref(TextV0Type),
  comments: S.optional(
    S.array(
      S.struct({
        thread: S.optional(E.ref(E.AnyEchoObject)),
        cursor: S.optional(S.string),
      }),
    ),
  ),
}) {}

export const isDocument = (data: unknown): data is E.EchoReactiveObject<DocumentType> =>
  !!data && DocumentType.isInstance(data);
