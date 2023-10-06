//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Canvas } from './Canvas';
import { MosaicContextProvider } from '../../mosaic';
import { FullscreenDecorator } from '../../testing';

faker.seed(99);

export default {
  component: Canvas,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => {
  return (
    <MosaicContextProvider debug>
      <Canvas.Root id='canvas'>
        <Canvas.Viewport />
      </Canvas.Root>
    </MosaicContextProvider>
  );
};
