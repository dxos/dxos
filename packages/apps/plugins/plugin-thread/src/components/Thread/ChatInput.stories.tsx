//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ChatInput } from './ChatInput';

const Story = () => {
  return (
    <ChatInput
      className='p-2'
      onMessage={(message) => {
        console.log(message);
      }}
    />
  );
};

export default {
  component: ChatInput,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
