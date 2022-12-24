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
  const columnWidth = 300;
  const sidebarWidth = 200;

  return (
    <div className='full-screen'>
      <div className='flex' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>
      <div className='flex flex-1 overflow-x-scroll'>
        <div className='flex m-2'>
          <div className='flex m-2' style={{ width: columnWidth }}>
            <ProjectList />
          </div>

          <div className='flex m-2' style={{ width: columnWidth }}>
            <ContactList />
          </div>

          <div className='flex flex-col m-2' style={{ width: columnWidth }}>
            <div className='flex flex-1 flex-shrink-0 mb-4 overflow-hidden'>
              <TaskList />
            </div>
            <div className='flex flex-1 flex-shrink-0 overflow-hidden'>
              <TaskList completed={true} readonly />
            </div>
          </div>

          <div className='flex flex-1 m-2' style={{ width: (columnWidth * 3) / 2 }}>
            <ProjectGraph />
          </div>
        </div>
      </div>
    </div>
  );
};
