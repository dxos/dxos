//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ContactList } from './ContactList';
import { Game } from './Game';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { Sidebar } from './Sidebar';
import { TaskList } from './TaskList';

const sidebarWidth = 200;

/**
 * Main grid layout.
 */
export const Main = () => {
  // TODO(burdon): Dynamic masonry (set cols based on width, scroll-y with min height).
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 32) / 2 } : {};

  return (
    <div ref={ref} className='full-screen'>
      <div className='flex' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>

      <div className='flex flex-1 flex-col p-2'>
        <div className='flex grid grid-cols-5 grid-flow-col gap-4 overflow-y-scroll'>
          <div className='flex flex-shrink-0 col-span-2' style={props}>
            <ProjectList />
          </div>

          <div className='flex flex-shrink-0' style={props}>
            <TaskList title='Complete Tasks' completed={true} readonly />
          </div>

          <div className='flex flex-shrink-0 col-span-2' style={props}>
            <ContactList />
          </div>

          <div className='flex flex-shrink-0' style={props}>
            <TaskList />
          </div>

          <div className='flex flex-shrink-0 col-span-2 row-span-2' style={props}>
            <ProjectGraph />
          </div>

          {false && (
            <div className='flex flex-shrink-0' style={props}>
              <Game />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
