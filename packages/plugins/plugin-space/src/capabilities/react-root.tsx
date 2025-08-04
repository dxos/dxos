//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { AwaitingObject } from '../components';
import { SPACE_PLUGIN } from '../meta';

import { SpaceCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactRoot, {
    id: SPACE_PLUGIN,
    root: () => {
      const state = useCapability(SpaceCapabilities.State);
      return state.awaiting ? <AwaitingObject id={state.awaiting} /> : null;
    },
  });
