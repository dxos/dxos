//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

export const Text = Schema.Struct({
  content: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Text',
    version: '0.1.0',
  }),
);

export interface Text extends Schema.Schema.Type<typeof Text> {}
