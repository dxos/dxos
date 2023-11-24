//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';
export const SEARCH_RESULT = `${SEARCH_PLUGIN}/result`;

export default pluginMeta({
  id: SEARCH_PLUGIN,
  name: 'Search',
  iconComponent: (props) => <MagnifyingGlass {...props} />,
});
