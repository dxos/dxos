//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';

import { HelpContextProvider } from './components';
import meta from './meta';

export const HelpPlugin = (): PluginDefinition => {
  return {
    meta,
    provides: {
      context: ({ children }) => {
        return <HelpContextProvider steps={[]}>{children}</HelpContextProvider>;
      },
    },
  };
};
