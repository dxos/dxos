//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { PublicKey } from '@dxos/keys';

import { Plugin, useSurface } from '../framework';

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

export class StackPlugin extends Plugin<StackPluginState> {
  constructor() {
    super({
      id: 'org.dxos.stack',
      components: {
        main: Stack
      }
    });
  }

  override getComponent(context: any) {
    const { object } = context;
    if (object?.type === DocumentStack.type) {
      return this.config.components.main;
    }
  }
}
