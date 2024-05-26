//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { PageNumber, Pager, StartButton } from './Pager';

const Story: FC<{ count?: number }> = ({ count = 20 }) => {
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

export default {
  title: 'plugin-presenter/Pager',
  render: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {};
