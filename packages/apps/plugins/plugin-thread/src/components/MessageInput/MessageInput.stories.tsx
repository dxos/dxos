//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { MessageInput } from './MessageInput';

const Story = () => {
  const [processing, setProcessing] = useState(false);

  const handleClick = () => {
    setProcessing(true);
    const t = setTimeout(() => {
      setProcessing(false);
    }, 2_000);

    return () => clearTimeout(t);
  };

  return (
    <div className='flex w-[500px] gap-2'>
      <MessageInput
        className='p-2'
        placeholder='Enter message...'
        processing={processing}
        onMessage={(message) => {
          console.log(message);
        }}
      />
      <Button onClick={handleClick}>Click</Button>
    </div>
  );
};

export default {
  title: 'plugin-thread/MessageInput',
  component: MessageInput,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
