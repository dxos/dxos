//
// Copyright 2025 DXOS.org
//

import { SchemaAST, SchemaEx } from '@dxos/effect';

import { getNumericConstraints } from '../NumberField/index.ts';

// Kept out of `ArrayField.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/**
 * Returns the default empty value for a given AST.
 * Used for initializing new array values etc.
 */
// TODO(wittjosiah): Factor out?
export const getDefaultValue = (ast?: SchemaAST.AST): any => {
  switch (ast?._tag) {
    case 'String': {
      return '';
    }
    case 'Number': {
      // v4 has no `Refinement` node: a refined number IS a `Number` node carrying checks, so the
      // declared minimum (e.g. `Schema.isBetween(1, 31)`) is read from them and used as the default
      // so new array items start within the valid range.
      return getNumericConstraints(ast).min ?? 0;
    }
    case 'Boolean': {
      return false;
    }
    case 'Suspend': {
      return getDefaultValue(ast.thunk());
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
