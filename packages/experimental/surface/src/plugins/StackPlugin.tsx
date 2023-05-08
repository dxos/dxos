//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';

import { Plugin } from '../framework';

// TODO(burdon): Implement toy stack by listing object in space.

const Stack = () => {
  // TODO(burdon): Get state from Surface.
  // const { state: { spaceKey } } = useSurface();
  return <div>Stack</div>;
};

const StackPluginState = {
  spaceKey: PublicKey
};

export const StackPlugin: Plugin = {
  id: 'org.dxos.stack',
  // TODO(burdon): Configure Plugin with mapping from AppState.
  state: StackPluginState,
  components: {
    main: Stack
  }
};
