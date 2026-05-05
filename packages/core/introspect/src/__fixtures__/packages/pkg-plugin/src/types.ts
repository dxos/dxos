//
// Copyright 2026 DXOS.org
//

// Schema fixture used by extractSchemas tests. Mirrors the canonical DXOS
// shape: `Schema.Struct(...).pipe(Type.object({ typename, version }))`.

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

/**
 * Note item — fixture ECHO type, references Task by typename string so tests
 * can exercise findSchemaUsage across packages.
 */
export const Note = Schema.Struct({
  title: Schema.String.annotations({ description: 'Short title.' }),
  body: Schema.optional(Schema.String),
  // Reference to com.example.type.Task lives in a string literal so the
  // textual usage scan can find it.
  relatedTo: Schema.optional(Schema.String).annotations({
    description: 'Typename of a related Task: com.example.type.Task',
  }),
}).pipe(
  Type.object({
    typename: 'com.example.type.Note',
    version: '0.2.0',
  }),
);

export type Note = Schema.Schema.Type<typeof Note>;
