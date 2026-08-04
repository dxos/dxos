//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';

import { RoutineSettings } from '#containers';

/** Space-scoped automation settings; the active space comes from context, not from the surface data. */
export const RoutineSettingsSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <RoutineSettings space={space} />;
};
