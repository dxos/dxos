//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { TaskList } from '../containers';

export const TasksFrame = () => {
  return (
    <div className='min-bs-full flex flex-1 justify-center bg-panel-bg'>
      <TaskList />
    </div>
  );
};

export default TasksFrame;
