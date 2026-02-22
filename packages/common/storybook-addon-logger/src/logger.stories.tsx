//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';

const DefaultStory = () => {
  const handleClick = () => {
    log.trace('trace message');
    log.debug('debug message');
    log.info('info message');
    log.warn('warn message');
    log.error('error message');
  };

  return (
    <div className='flex flex-col gap-4'>
      <p>Use the log level toolbar control to filter messages.</p>
      <button className='p-1 border border-separator rounded-sm hover:bg-hoverSurface' onClick={handleClick}>
        Log messages
      </button>
    </div>
  );
};

const meta = {
  title: 'common/storybook-addon-logger/Logger',
  render: DefaultStory,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
