//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { S } from '@dxos/echo-schema';

const TextSchema = S.Struct({
  content: S.String,
});

export const Text = TextSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Text',
    version: '0.1.0',
  }),
);

export interface Text extends S.Schema.Type<typeof Text> {}
