//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { UnorderedTaskList } from '../../containers';
import { useSpace } from '../../hooks';

export const TaskFrame = () => {
  const space = useSpace();
  return (
    <main className='min-bs-full flex-1 justify-center overflow-auto p-0 md:p-4'>
      <div role='none' className='min-bs-full mli-auto is-full md:is-column bg-paper-bg shadow-1'>
        <UnorderedTaskList space={space} />
      </div>
    </main>
  );
};
