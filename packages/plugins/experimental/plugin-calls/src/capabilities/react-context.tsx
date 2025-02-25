//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { type PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';

import { CallsGlobalContext, type CallsGlobalContextType } from '../hooks';
import { CALLS_PLUGIN } from '../meta';

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
