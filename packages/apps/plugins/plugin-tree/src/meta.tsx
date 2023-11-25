//
// Copyright 2023 DXOS.org
//

import { TreeStructure } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const TREE_PLUGIN = 'dxos.org/plugin/tree';

export default pluginMeta({
  id: TREE_PLUGIN,
  name: 'Tree',
  iconComponent: (props) => <TreeStructure {...props} />,
});
