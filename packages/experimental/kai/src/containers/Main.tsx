//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ContactList } from './ContactList';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { Sidebar } from './Sidebar';
import { TaskList } from './TaskList';

export const Main = () => {
  const columnWidth = 290;
  const sidebarWidth = 230;

  return (
    <div className='full-screen'>
      <div className='flex' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>

      <div className='flex flex-1 overflow-x-scroll p-3'>
        <div className='grid grid-rows-2 grid-flow-col gap-3'>
          <div className='flex' style={{ width: columnWidth * 2 }}>
            <ProjectList />
          </div>

          <div className='flex' style={{ width: columnWidth }}>
            <ContactList />
          </div>

          <div className='flex' style={{ width: columnWidth }}>
            <TaskList />
          </div>

          <div className='flex' style={{ width: columnWidth }}>
            <TaskList completed={true} readonly />
          </div>

          <div className='flex row-span-2' style={{ width: columnWidth * 2 }}>
            <ProjectGraph />
          </div>
        </div>
      </div>
    </div>
  );
};
