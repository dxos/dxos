//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { SchemaAST, SchemaEx } from '@dxos/effect';

// Kept out of `ArrayField.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/**
 * Returns the default empty value for a given AST.
 * Used for initializing new array values etc.
 */
// TODO(wittjosiah): Factor out?
export const getDefaultValue = (ast?: SchemaAST.AST): any => {
  switch (ast?._tag) {
    case 'StringKeyword': {
      return '';
    }
    case 'NumberKeyword': {
      return 0;
    }
    case 'BooleanKeyword': {
      return false;
    }
    case 'Suspend': {
      return getDefaultValue(ast.f());
    }
    case 'Refinement': {
      // Use minimum from JSON schema annotation (e.g. Schema.between(1, 31)) as the default
      // so new array items start within the valid range.
      const jsonSchema = Option.getOrUndefined(SchemaAST.getJSONSchemaAnnotation(ast));
      if (jsonSchema != null && 'minimum' in jsonSchema && typeof jsonSchema.minimum === 'number') {
        return jsonSchema.minimum;
      }
      return getDefaultValue(ast.from);
    }
    default: {
      if (ast && SchemaEx.isNestedType(ast)) {
        return {};
      } else {
        throw new Error(`Unsupported type: ${ast?._tag}`);
      }
    }
  }
};
