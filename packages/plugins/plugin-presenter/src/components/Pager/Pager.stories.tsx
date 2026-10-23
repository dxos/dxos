//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { PageNumber, Pager, type PagerProps } from './Pager.tsx';

const DefaultStory = ({ count = 20 }: PagerProps) => {
  const [index, setIndex] = useState(0);

  return (
    <div className='grid grid-cols-2 gap-8'>
      <Pager index={index} count={count} onChange={setIndex} />
      <PageNumber index={index} count={count} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/Pager',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
