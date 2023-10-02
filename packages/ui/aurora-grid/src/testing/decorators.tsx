//
// Copyright 2023 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { DensityProvider } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { MosaicContextProvider } from '../dnd';

export const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    </div>
  );
};

export const MosaicDecorator: DecoratorFunction<ReactRenderer> = (Story) => (
  <MosaicContextProvider debug>
    <Story />
  </MosaicContextProvider>
);
