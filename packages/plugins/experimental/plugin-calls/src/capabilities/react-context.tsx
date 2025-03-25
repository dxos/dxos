//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';

import { CallGlobalContextProvider } from '../components';
import { MEETING_PLUGIN } from '../meta';

export type CallsPluginOptions = {};

export default (_options: CallsPluginOptions = {}) => {
  return contributes(
    Capabilities.ReactContext,
    {
      id: MEETING_PLUGIN,
      context: ({ children }) => {
        return <CallGlobalContextProvider>{children}</CallGlobalContextProvider>;
      },
    },
    () => {},
  );
};
