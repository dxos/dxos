//
// Copyright 2023 DXOS.org
//

import { ArticleMedium } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

export default pluginMeta({
  id: MARKDOWN_PLUGIN,
  name: 'Markdown',
  description: 'Markdown text editor.',
  iconComponent: (props) => <ArticleMedium {...props} />,
});
