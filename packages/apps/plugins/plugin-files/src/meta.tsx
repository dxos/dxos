//
// Copyright 2023 DXOS.org
//

import { File, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const FILES_PLUGIN = 'dxos.org/plugin/files';
export const FILES_PLUGIN_SHORT_ID = 'fs';

export default pluginMeta({
  id: FILES_PLUGIN,
  shortId: FILES_PLUGIN_SHORT_ID,
  name: 'Files',
  description: 'Open files from the local file system.',
  iconComponent: (props: IconProps) => <File {...props} />,
});
