//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { PublicKey } from '@dxos/keys';

import { PluginBase, useSurface } from '../framework';

const Stack = () => {
  // TODO(burdon): Make type-safe.
  const {
    data: { object }
  } = useSurface();

  return <div>{object.id}</div>;
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

  override getComponent(context: any) {
    const { object } = context;
    if (object?.type === DocumentStack.type) {
      return this.components.main;
    }
  }
}
