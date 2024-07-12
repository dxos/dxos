//
// Copyright 2023 DXOS.org
//

import { type Decorator, type StoryFn } from '@storybook/react';
import React from 'react';

import { type ClassNameValue, type Density, DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const withFullscreen = ({
  classNames,
  density,
}: {
  classNames?: ClassNameValue;
  density?: Density;
} = {}): Decorator => {
  return (Story: StoryFn) => (
    <div className={mx('fixed flex inset-0 overflow-hidden', classNames)}>
      <DensityProvider density={density ?? 'fine'}>
        <Story />
      </DensityProvider>
    </div>
  );
};
