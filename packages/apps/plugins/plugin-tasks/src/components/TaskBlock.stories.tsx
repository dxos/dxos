//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { TextObject } from '@dxos/client/echo';

import { TaskBlock } from './TaskBlock';

const Story = () => {
  const [text] = useState(new TextObject('Hello'));

  return (
    <div className='m-2 ring'>
      <TaskBlock task={{ id: 'task-1', text }} />
    </div>
  );
};

export default {
  component: TaskBlock,
  render: Story,
};

export const Default = {};
