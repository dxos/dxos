//
// Copyright 2025 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class TextType extends TypedObject({ typename: 'dxos.org/type/Text', version: '0.1.0' })({
  content: S.String,
}) {}

// export const TextType = S.Struct({
//   id: ObjectId,
//   content: S.String,
// }).pipe(EchoObject('dxos.org/type/Text', '0.1.0'));
// export type TextType = S.Schema.Type<typeof TextType>;
