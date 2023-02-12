//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { TaskList } from '../../containers';
import { useSpace } from '../../hooks';

export const TaskFrame = () => {
  const space = useSpace();
  return (
    <div className='min-bs-full flex flex-1 justify-center'>
      <div className='flex my-4 md:shadow'>
        <TaskList space={space} />
      </div>
    </div>
  );
};
