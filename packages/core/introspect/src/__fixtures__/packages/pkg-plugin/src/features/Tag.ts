//
// Copyright 2026 DXOS.org
//

// Schema fixture in a non-conventional location (`src/features/`) — exercises
// the recursive `**/*.ts` scan in extractSchemas. Earlier versions only
// scanned a hard-coded folder set and would have missed this entirely.

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

/**
 * Tag — fixture ECHO type buried in a feature folder.
 */
export const Tag = Schema.Struct({
  label: Schema.String,
  color: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'com.example.type.Tag',
    version: '0.1.0',
  }),
);

export type Tag = Schema.Schema.Type<typeof Tag>;
