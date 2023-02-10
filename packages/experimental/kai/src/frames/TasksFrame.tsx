//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-components';

import { TaskListQuery } from '../containers';

export const TasksFrame = () => {
  return (
    <div className='bs-full overflow-y-auto bg-panel-bg'>
      <div className={mx('min-bs-full bg-white is-full md:is-column mli-auto p-2')}>
        <TaskListQuery id='tasksFrame' />
      </div>
    </div>
  );
};

export default TasksFrame;
