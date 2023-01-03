//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';

import { views, ContactList, Editor, ProjectGraph, ProjectList, Sidebar, TaskList } from '../../containers';
import { SpaceContext, SpaceContextType } from '../../hooks';

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
const ViewContainer: FC<{ view: string }> = ({ view }) => {
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

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const { spaceKey: currentSpaceKey, view } = useParams();
  const spaces = useSpaces();
  const [context, setContext] = useState<SpaceContextType | undefined>();

  useEffect(() => {
    if (!view || views.findIndex(({ key }) => key === view) === -1) {
      navigate(`/${currentSpaceKey}/${views[0].key}`);
    }
  }, [view, currentSpaceKey]);

  useEffect(() => {
    if (!spaces.length) {
      navigate('/');
      return;
    }

    const space = spaces.find((space) => space.key.truncate() === currentSpaceKey);
    if (space) {
      setContext({ space });
    } else {
      navigate('/');
    }
  }, [spaces, currentSpaceKey]);

  if (!context) {
    return null;
  }

  // prettier-ignore
  return (
    <SpaceContext.Provider value={context}>
      {view && <ViewContainer view={view} />}
    </SpaceContext.Provider>
  );
};
