//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Task } from '@dxos/kai-types';
import { useQuery } from '@dxos/react-client/echo';

import { TaskList } from '../../cards';
import { useFrameContext } from '../../hooks';

export const TaskFrame = () => {
  const { space } = useFrameContext();
  const tasks = useQuery(space, Task.filter());
  if (!space) {
    return null;
  }

  return (
    <div className='min-bs-full flex-1 justify-center overflow-auto p-0 md:p-4'>
      <div role='none' className='min-bs-full mli-auto is-full md:is-column bg-paper-bg shadow-1'>
        <TaskList id='tasks' tasks={tasks} />
      </div>
    </div>
  );
};

export default TaskFrame;
