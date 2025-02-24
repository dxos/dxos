//
// Copyright 2025 DXOS.org
//

import React, { createContext } from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';

import { CALLS_PLUGIN } from '../meta';
import { CallsGlobalContext, CallsGlobalContextType } from '../hooks';

export type CallsPluginOptions = {};

export default (_options: CallsPluginOptions = {}) => {
  const state = create<CallsGlobalContextType>({
    setSpace: (spaceKey: PublicKey) => {
      state.spaceKey = spaceKey;
    },
  });

  return contributes(
    Capabilities.ReactContext,
    {
      id: CALLS_PLUGIN,
      context: ({ children }) => {
        return <CallsGlobalContext.Provider value={state}>{children}</CallsGlobalContext.Provider>;
      },
    },
    () => {},
  );
};
