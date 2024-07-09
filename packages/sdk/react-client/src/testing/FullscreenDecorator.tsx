//
// Copyright 2023 DXOS.org
//

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React from 'react';

import { type ClassNameValue, type Density, DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type RootDecoratorProps = {
  classNames?: ClassNameValue;
  density?: Density;
};

export const FullscreenDecorator = ({
  classNames,
  density = 'fine',
}: RootDecoratorProps = {}): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('fixed flex inset-0 overflow-hidden', classNames)}>
      <DensityProvider density={density}>
        <Story />
      </DensityProvider>
    </div>
  );
};
