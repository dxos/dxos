//
// Copyright 2022 DXOS.org
//

import { Bug, ShareNetwork } from 'phosphor-react';
import React from 'react';

import { getSize } from '@dxos/react-ui';

import { ContactList } from './ContactList';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { TaskList } from './TaskList';

export const Main = () => {
  const columnWidth = 300;
  const sidebarWidth = 200;

  const Sidebar = () => {
    return (
      <div className='flex flex-1 flex-col bg-slate-700 text-white'>
        <div className='flex p-3 mb-2'>
          <div className='flex flex-1'>
            <Bug className={getSize(8)} />
            <div className='flex-1'></div>
            <div className='p-1'>
              <button>
                <ShareNetwork className={getSize(6)} />
              </button>
            </div>
          </div>
        </div>
        <div className='p-2 pl-4 bg-slate-600'>A</div>
        <div className='p-2 pl-4'>B</div>
        <div className='p-2 pl-4'>C</div>
      </div>
    );
  };

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
