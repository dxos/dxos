//
// Copyright 2023 DXOS.org
//

import { type StoryFn } from '@storybook/react';
import React from 'react';

import { DensityProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

/**
 * @deprecated
 */
// TODO(burdon): Remove (replace with rect-ui/testing).
export const FullscreenDecorator = (className?: string) => {
  return (Story: StoryFn) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    </div>
  );
};
