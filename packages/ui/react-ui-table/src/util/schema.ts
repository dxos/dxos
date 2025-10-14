//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { TypeLiteral, isTypeLiteral } from 'effect/SchemaAST';

/**
 * Creates a narrowed schema from an original schema that only includes
 * the specified paths. This allows form components to only display
 * and edit/validate specific fields rather than the entire object.
 *
 * @param schema The original schema to narrow
 * @param paths Array of field paths to extract
 * @returns A narrowed Schema instance containing only the properties at the specified paths
 */
export const narrowSchema = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  paths: string[],
): Schema.Schema<unknown, unknown> | undefined => {
  const ast = (schema as any)?.ast;

  if (isTypeLiteral(ast)) {
    // Filter property signatures that match any of the provided paths
    const propertySignatures = ast.propertySignatures.filter((signature) => paths.includes(signature.name.toString()));

    // If we found at least one matching property
    if (propertySignatures.length > 0) {
      // Create a new TypeLiteral with only the matching properties
      const narrowType = new TypeLiteral(propertySignatures, []);
      return Schema.make(narrowType);
    }
  }

  return undefined;
};
