//
// Copyright 2023 DXOS.org
//

import { type IconProps, TextAa } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

export default pluginMeta({
  id: MARKDOWN_PLUGIN,
  name: 'Editor',
  description: 'Markdown text editor.',
  homePage: 'https://github.com/dxos/dxos/tree/main/packages/apps/plugins/plugin-markdown',
  iconComponent: (props: IconProps) => <TextAa {...props} />,
});
