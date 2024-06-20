//
// Copyright 2023 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const WNFS_PLUGIN = 'dxos.org/plugin/WNFS';

export default pluginMeta({
  id: WNFS_PLUGIN,
  name: 'WNFS',
  description: 'Upload & view files with WNFS.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <FileCloud {...props} />,
});
