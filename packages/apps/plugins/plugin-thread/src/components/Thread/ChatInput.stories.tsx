//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ChatInput } from './ChatInput';

const Story = () => {
  return (
    <ChatInput
      onMessage={(message) => {
        console.log(message);
      }}
    />
  );
};

export default {
  component: ChatInput,
  render: Story,
};

export const Default = {};
