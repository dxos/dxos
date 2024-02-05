//
// Copyright 2023 DXOS.org
//

import { TreeStructure, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const OUTLINER_PLUGIN = 'dxos.org/plugin/outliner';

export default pluginMeta({
  id: OUTLINER_PLUGIN,
  name: 'Outliner',
  description: 'Hierarchical note editor.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <TreeStructure {...props} />,
});
