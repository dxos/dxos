//
// Copyright 2023 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const IPFS_PLUGIN = 'dxos.org/plugin/ipfs';

export default pluginMeta({
  id: IPFS_PLUGIN,
  name: 'IPFS',
  iconComponent: (props: IconProps) => <FileCloud {...props} />,
});
