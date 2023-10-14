//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { PageNumber, Pager } from './Pager';

const Story: FC<{ count?: number }> = ({ count = 20 }) => {
  const [index, setIndex] = useState(0);

  return (
    <div className='grid grid-cols-2 gap-8'>
      <Pager index={index} count={count} onChange={setIndex} />
      <PageNumber index={index} count={count} />
    </div>
  );
};

export default {
  component: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {};
