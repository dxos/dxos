//
// Copyright 2023 DXOS.org
//

import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

/**
 * @deprecated
 */
// TODO(wittjosiah): Remove.
export const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    </div>
  );
};
