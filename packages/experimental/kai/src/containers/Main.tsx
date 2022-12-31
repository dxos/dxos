//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ContactList } from './ContactList';
import { Editor } from './Editor';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { Sidebar } from './Sidebar';
import { TaskList } from './TaskList';

const sidebarWidth = 200;

const BlocksView: FC<{ props: any }> = ({ props }) => {
  return (
    <div className='flex grid grid-cols-5 grid-flow-row gap-4 overflow-y-scroll'>
      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ProjectList />
      </div>

      <div className='flex flex-shrink-0' style={props}>
        <TaskList title='Completed Tasks' completed={true} readonly />
      </div>

      <div className='flex flex-shrink-0 col-span-2 row-span-2' style={props}>
        <ProjectGraph />
      </div>

      <div className='flex flex-shrink-0' style={props}>
        <TaskList />
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ContactList />
      </div>

      {/*
      <div className='flex flex-shrink-0 col-span-3' style={props}>
        <Game />
      </div>
      */}

      <div className='flex flex-shrink-0 col-span-5' style={props}>
        <Editor />
      </div>
    </div>
  );
};

const TasksView: FC<{ props: any }> = ({ props }) => {
  return (
    <div className='flex flex-1 justify-center'>
      <div className='flex' style={{ width: 600 }}>
        <TaskList />
      </div>
    </div>
  );
};

const EditorView: FC<{ props: any }> = ({ props }) => {
  return <Editor />;
};

/**
 * Main grid layout.
 */
export const Main: FC<{ view: string }> = ({ view }) => {
  // TODO(burdon): Dynamic masonry (set cols based on width, scroll-y with min height).
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 32) / 2 } : {};

  return (
    <div ref={ref} className='full-screen'>
      <div className='flex' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>

      <div className='flex flex-1 flex-col p-2'>
        {view === 'blocks' && <BlocksView props={props} />}
        {view === 'tasks' && <TasksView props={props} />}
        {view === 'editor' && <EditorView props={props} />}
      </div>
    </div>
  );
};
