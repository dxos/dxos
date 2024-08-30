//
// Copyright 2023 DXOS.org
//

import { File, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const FILES_PLUGIN = 'dxos.org/plugin/files';

export default pluginMeta({
  id: FILES_PLUGIN,
  name: 'Files',
  description: 'Open files from the local file system.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <File {...props} />,
  iconSymbol: 'ph--file--regular',
});
