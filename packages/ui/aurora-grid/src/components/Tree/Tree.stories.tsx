//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Tree } from './Tree';
import { MosaicContextProvider } from '../../dnd';
import { FullscreenDecorator } from '../../testing';

faker.seed(3);

export default {
  component: Tree,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => {
  return (
    <MosaicContextProvider debug>
      <Tree.Root id='tree' />
    </MosaicContextProvider>
  );
};
