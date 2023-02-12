//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { TaskList } from '../../containers';
import { useSpace } from '../../hooks';

export const TaskFrame = () => {
  const space = useSpace();
  return (
    <div className='min-bs-full flex flex-1 justify-center bg-panel-bg'>
      <TaskList space={space} />
    </div>
  );
};
