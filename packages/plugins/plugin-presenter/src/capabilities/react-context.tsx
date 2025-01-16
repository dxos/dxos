//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { PresenterCapabilities } from './capabilities';
import { PRESENTER_PLUGIN } from '../meta';
import { PresenterContext } from '../types';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: PRESENTER_PLUGIN,
    context: ({ children }) => {
      const state = useCapability(PresenterCapabilities.MutableState);

      return (
        <PresenterContext.Provider
          value={{
            running: state.presenting,
            start: () => (state.presenting = true),
            stop: () => (state.presenting = false),
          }}
        >
          {children}
        </PresenterContext.Provider>
      );
    },
  });
