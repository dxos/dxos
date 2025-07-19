//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { JsonPath } from '@dxos/effect';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: JsonPath,
  referencePath: Schema.optional(JsonPath),

  // TODO(wittjosiah): Remove this? Duplicate of hiddenFields?
  visible: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

export const KeyValueProps = Schema.Record({ key: Schema.String, value: Schema.Any });
