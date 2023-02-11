//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { UnorderedTaskList } from '../../containers';

export const TaskFrame = () => {
  return (
    <main className='min-bs-full flex-1 justify-center bg-panel-bg overflow-auto'>
      <div role='none' className='min-bs-full mli-auto bg-white is-full md:is-column p-2'>
        <UnorderedTaskList />
      </div>
    </main>
  );
};
