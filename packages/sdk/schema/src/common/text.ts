//
// Copyright 2025 DXOS.org
//

import { EchoObject, ObjectId, S } from '@dxos/echo-schema';

export const TextType = S.Struct({
  id: ObjectId,
  content: S.String,
}).pipe(EchoObject('dxos.org/type/Text', '0.1.0'));
export type TextType = S.Schema.Type<typeof TextType>;
