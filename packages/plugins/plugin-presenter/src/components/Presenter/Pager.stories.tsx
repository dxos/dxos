//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { PageNumber, Pager, type PagerProps, StartButton } from './Pager';

const DefaultStory = ({ count = 20 }: PagerProps) => {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);

  return (
    <div className='grid grid-cols-3 gap-8'>
      <Pager index={index} count={count} onChange={setIndex} />
      <PageNumber index={index} count={count} />
      <StartButton running={running} onClick={setRunning} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/Pager',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
