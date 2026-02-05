//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';

import { Mosaic } from '../components';

export const withMosaic = (): Decorator => {
  return (Story) => (
    <Mosaic.Root>
      <Story />
    </Mosaic.Root>
  );
};
