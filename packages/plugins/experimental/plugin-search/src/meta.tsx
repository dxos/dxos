//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';
export const SEARCH_RESULT = `${SEARCH_PLUGIN}/result`;

export default pluginMeta({
  id: SEARCH_PLUGIN,
  name: 'Search',
  description: 'Search ECHO spaces for content.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <MagnifyingGlass {...props} />,
  iconSymbol: 'ph--magnifying-glass--regular',
});
