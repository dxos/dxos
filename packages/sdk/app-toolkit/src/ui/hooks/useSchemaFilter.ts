//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Type } from '@dxos/echo';

// TODO(wittjosiah): This should use the full query AST directly.
//   That currently doesn't work for dynamic schema objects because their indexed typename is the schema object DXN.
//   RuntimeType (database-registered schema) carries an object-DXN TypeIdentifierAnnotation, so Filter.type()
//   would produce a filter that never matches objects tagged with a type-DXN (created from an unregistered
//   Effect schema). Use Filter.typename() for RuntimeType to emit a type-DXN filter instead.
export const useSchemaFilter = (schema: Type.AnyEntity | undefined): Filter.Any =>
  useMemo(
    () =>
      schema instanceof Type.RuntimeType
        ? Filter.typename(schema.typename)
        : schema
          ? Filter.type(schema)
          : Filter.nothing(),
    [schema],
  );
