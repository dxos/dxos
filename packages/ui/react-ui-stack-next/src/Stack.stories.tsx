//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';

const StackItem = () => {
  return <div className='border border-separator p-2'>This is an item</div>;
};

const StorybookStack = () => {
  return (
    <Stack>
      <StackItem />
      <StackItem />
      <StackItem />
      <StackItem />
    </Stack>
  );
};

export default {
  title: 'react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
};

export const Default = {};
