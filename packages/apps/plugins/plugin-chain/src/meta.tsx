//
// Copyright 2023 DXOS.org
//

import { TreeStructure } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const CHAIN_PLUGIN = 'dxos.org/plugin/chain';

export default pluginMeta({
  id: CHAIN_PLUGIN,
  name: 'Chain',
  tags: ['experimental'],
  iconComponent: (props) => <TreeStructure {...props} />,
});
