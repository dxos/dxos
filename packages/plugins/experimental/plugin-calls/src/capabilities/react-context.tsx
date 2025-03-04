//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';

import { CallsGlobalContext } from '../hooks';
import { CALLS_PLUGIN } from '../meta';
import { CallManager } from '../state';

export type CallsPluginOptions = {};

export default (_options: CallsPluginOptions = {}) => {
  // Create a global live object containing the call state.
  const call = new CallManager();

  return contributes(
    Capabilities.ReactContext,
    {
      id: CALLS_PLUGIN,
      context: ({ children }) => {
        return <CallsGlobalContext.Provider value={{ call }}>{children}</CallsGlobalContext.Provider>;
      },
    },
    () => {},
  );
};
