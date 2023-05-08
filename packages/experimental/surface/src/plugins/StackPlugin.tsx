//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';

import { PluginBase } from '../framework';

// TODO(burdon): Implement toy stack by listing object in space.

const Stack = () => {
  // TODO(burdon): Get state from Surface.
  // const { state: { spaceKey } } = useSurface();
  return <div>Stack</div>;
};

export type StackPluginState = {
  spaceKey: PublicKey;
};

export class StackPlugin extends PluginBase<StackPluginState> {
  constructor() {
    super('org.dxos.stack', {
      main: Stack
    });
  }
}
