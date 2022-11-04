//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ConfigPanel = () => {
  const config = useConfig();
  console.log('config', config);
  return <JsonTreeView size='small' depth={4} data={config.values} />;
};
