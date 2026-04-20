//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { meta } from '@dxos/plugin-token-manager';

export const TokenManagerModule = () => {
  const data = useMemo(() => ({ subject: `${meta.id}.space-settings` }), []);
  return <Surface.Surface type={AppSurface.Article} data={data} limit={1} />;
};
