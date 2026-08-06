//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

// Kept out of `NumberField.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/**
 * Extracts numeric constraints (`minimum`/`maximum` bounds and whether the value must be an integer)
 * by walking the chain of Refinement ASTs and reading each one's JSON schema annotation (e.g. produced
 * by `Schema.between` / `Schema.int`). Returns empty constraints when none are declared.
 */
export const getNumericConstraints = (ast: SchemaAST.AST): { min?: number; max?: number; integer: boolean } => {
  let node: SchemaAST.AST | undefined = ast;
  let min: number | undefined;
  let max: number | undefined;
  let integer = false;
  // Nested refinements (e.g. `Schema.int()` + `Schema.between()`) each carry their own JSON schema
  // fragment, so accumulate across the chain rather than reading only the outermost node.
  while (node && SchemaAST.isRefinement(node)) {
    const jsonSchema = Option.getOrUndefined(SchemaAST.getJSONSchemaAnnotation(node));
    if (jsonSchema != null) {
      // Stacked refinements intersect: keep the strictest bound (largest min, smallest max).
      if ('minimum' in jsonSchema && typeof jsonSchema.minimum === 'number') {
        min = min === undefined ? jsonSchema.minimum : Math.max(min, jsonSchema.minimum);
      }
      if ('maximum' in jsonSchema && typeof jsonSchema.maximum === 'number') {
        max = max === undefined ? jsonSchema.maximum : Math.min(max, jsonSchema.maximum);
      }
      if (
        ('type' in jsonSchema && jsonSchema.type === 'integer') ||
        ('multipleOf' in jsonSchema && jsonSchema.multipleOf === 1)
      ) {
        integer = true;
      }
    }
    node = node.from;
  }
  return { min, max, integer };
};
