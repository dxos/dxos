//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _TextV0Schema = S.struct({
  content: S.string,
}).pipe(E.echoObject('dxos.Text.v0', '0.1.0'));
export interface TextV0Type extends E.ObjectType<typeof _TextV0Schema> {}
export const TextV0Schema: S.Schema<TextV0Type> = _TextV0Schema;

export const isTextV0 = (data: unknown): data is E.EchoReactiveObject<TextV0Type> =>
  !!data && E.getSchema<any>(data) === TextV0Schema;

const _DocumentSchema = S.struct({
  title: S.optional(S.string),
  content: E.ref(TextV0Schema),
  comments: S.optional(
    S.array(
      S.struct({
        thread: S.optional(E.ref(E.AnyEchoObject)),
        cursor: S.optional(S.string),
      }),
    ),
  ),
}).pipe(E.echoObject('braneframe.Document', '0.1.0'));
export interface DocumentType extends E.ObjectType<typeof _DocumentSchema> {}
export const DocumentSchema: S.Schema<DocumentType> = _DocumentSchema;

export const isDocument = (data: unknown): data is E.EchoReactiveObject<DocumentType> =>
  !!data && E.getSchema<any>(data) === DocumentSchema;
