//
// Copyright 2023 DXOS.org
//

import { type StoryFn } from '@storybook/react';
import React from 'react';

import { type ClassNameValue, type Density, DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Rename fullScreen.
export const FullscreenDecorator = ({
  classNames,
  density = 'fine',
}: {
  classNames?: ClassNameValue;
  density?: Density;
} = {}) => {
  return (Story: StoryFn) => (
    <div className={mx('fixed flex inset-0 overflow-hidden', classNames)}>
      <DensityProvider density={density}>
        <Story />
      </DensityProvider>
    </div>
  );
};
