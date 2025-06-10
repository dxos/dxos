//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

const TextSchema = Schema.Struct({
  content: Schema.String,
});

export const Text = TextSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Text',
    version: '0.1.0',
  }),
);

export interface Text extends Schema.Schema.Type<typeof Text> {}
