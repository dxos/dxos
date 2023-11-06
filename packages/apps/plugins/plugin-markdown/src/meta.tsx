//
// Copyright 2023 DXOS.org
//

import { ArticleMedium } from '@phosphor-icons/react';
import React from 'react';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

export default {
  id: MARKDOWN_PLUGIN,
  name: 'Markdown',
  description: 'Edit text in Markdown format',
  iconComponent: () => <ArticleMedium />,
};
