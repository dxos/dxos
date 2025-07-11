//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

export const TextDocument = Schema.Struct({
  content: Schema.String.annotations({ description: 'The content of the document.' }),
}).pipe(
  Type.Obj({
    typename: 'example.org/type/TextDocument',
    version: '0.1.0',
  }),
);
export interface TextDocument extends Schema.Schema.Type<typeof TextDocument> {}
