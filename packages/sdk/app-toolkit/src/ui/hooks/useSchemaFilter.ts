//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

// TODO(wittjosiah): This should use the full query AST directly.
//   RuntimeType-backed spaces can contain objects tagged with either the schema object DXN
//   (Obj.make registered schema) or the static type DXN (Obj.make Effect schema).
export const useSchemaFilter = (schema: Type.AnyEntity | undefined): Filter.Any =>
  useMemo(() => {
    if (!schema) {
      return Filter.nothing();
    }

    if (Type.getDatabase(schema) != null) {
      const typename = Type.getTypename(schema);
      return typename != null ? Filter.or(Filter.type(schema), Filter.type(DXN.make(typename))) : Filter.type(schema);
    }

    return Filter.type(schema);
  }, [schema]);
