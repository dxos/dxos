//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';

import { Dnd } from '@dxos/react-ui-dnd';

export const withMosaic = (): Decorator => {
  return (Story) => (
    <Dnd.Root>
      <Story />
    </Dnd.Root>
  );
};
