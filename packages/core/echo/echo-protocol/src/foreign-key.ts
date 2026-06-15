//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

const ForeignKey_ = Schema.Struct({
  /**
   * Name of the foreign database/system.
   * E.g., `github.com`.
   */
  source: Schema.String,

  /**
   * Id within the foreign database.
   */
  // TODO(wittjosiah): This annotation is currently used to ensure id field shows up in forms.
  // TODO(dmaretskyi): `false` is not a valid value for the annotation. Use a different annotation.
  id: Schema.String.annotations({ [SchemaAST.IdentifierAnnotationId]: 'false' }),
});

export type ForeignKey = Schema.Schema.Type<typeof ForeignKey_>;

/**
 * Reference to an object in a foreign database.
 */
export const ForeignKey: Schema.Schema<ForeignKey> = ForeignKey_;
