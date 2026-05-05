//
// Copyright 2026 DXOS.org
//

// Schema fixture used by extractSchemas tests. Mirrors the canonical DXOS
// shape: `Schema.Struct(...).pipe(Type.object({ typename, version }))`.

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

// Sibling reference: the line below mentions com.example.type.Task AND
// Type.object, but NOT in a `typename:` position. The skip-heuristic in
// findSchemaUsage must NOT discard this — only lines that are themselves a
// definition (Type.object + typename:) get skipped.
//
// Inputs flow through Type.object — see com.example.type.Task for the shape.

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
