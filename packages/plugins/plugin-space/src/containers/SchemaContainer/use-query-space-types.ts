//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

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
