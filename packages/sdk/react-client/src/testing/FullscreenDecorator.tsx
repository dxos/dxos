//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { type ClassNameValue, type Density, DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Rename fullScreen.
export const FullscreenDecorator = ({
  classNames,
  density,
}: {
  classNames?: ClassNameValue;
  density?: Density;
} = {}): Decorator => {
  return (Story) => (
    <div className={mx('fixed flex inset-0 overflow-hidden', classNames)}>
      <DensityProvider density={density ?? 'fine'}>
        <Story />
      </DensityProvider>
    </div>
  );
};
