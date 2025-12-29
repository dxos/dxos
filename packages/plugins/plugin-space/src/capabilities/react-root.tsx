//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { AwaitingObject } from '../components';
import { meta } from '../meta';
import { SpaceCapabilities } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactRoot, {
    id: meta.id,
    root: () => {
      const state = useCapability(SpaceCapabilities.State);
      return state.awaiting ? <AwaitingObject id={state.awaiting} /> : null;
    },
  }),
);
