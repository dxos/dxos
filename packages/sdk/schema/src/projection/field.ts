//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { JsonPath } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: JsonPath,
  visible: Schema.optional(Schema.Boolean),

  // TODO(wittjosiah): Presentation-specific?
  referencePath: Schema.optional(JsonPath),
}).pipe(Schema.mutable);

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

export const KeyValueProps = Schema.Record({ key: Schema.String, value: Schema.Any });

export const createFieldId = () => PublicKey.random().truncate();
