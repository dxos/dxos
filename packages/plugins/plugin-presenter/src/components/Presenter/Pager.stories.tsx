//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { PageNumber, Pager, type PagerProps, StartButton } from './Pager';

const Story = ({ count = 20 }: PagerProps) => {
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

const meta: Meta<PagerProps> = {
  title: 'plugins/plugin-presenter/Pager',
  render: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {};
export default meta;
