//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { meta } from '@dxos/plugin-token-manager';

export const TokenManagerContainer = () => {
  const data = useMemo(() => ({ subject: `${meta.id}/space-settings` }), []);

  return <Surface role='article' data={data} limit={1} />;
};
