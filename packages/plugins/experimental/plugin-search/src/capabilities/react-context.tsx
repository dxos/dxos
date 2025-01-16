//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { contributes, Capabilities } from '@dxos/app-framework';

import { SearchContextProvider } from '../context';
import { SEARCH_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: SEARCH_PLUGIN,
    context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
  });
