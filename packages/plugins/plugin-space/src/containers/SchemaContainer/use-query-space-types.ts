//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

// Kept out of `SchemaContainer.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Subscribe to and retrieve all types from a space's registry.
 */
export const useQuerySpaceTypes = (space: Space): Type.AnyEntity[] => {
  const [types, setTypes] = useState<Type.AnyEntity[]>(() => [...space.db.graph.registry.list().filter(Type.isType)]);

  useEffect(() => {
    setTypes([...space.db.graph.registry.list().filter(Type.isType)]);
    return space.db.graph.registry.changed.on(() => {
      setTypes([...space.db.graph.registry.list().filter(Type.isType)]);
    });
  }, [space]);

  return types;
};
