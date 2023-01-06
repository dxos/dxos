//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { useNavigate, useParams } from 'react-router-dom';

import { id } from '@dxos/echo-schema';
import { useQuery, useSpaces } from '@dxos/react-client';

import { SearchBar, Selector } from '../../components';
import { ContactList, Editor, ProjectGraph, ProjectList, ProjectTree, Sidebar, TaskList } from '../../containers';
import { AppView, SpaceContext, SpaceContextType, useOptions, useSpace, viewConfig } from '../../hooks';
import { Project } from '../../proto';

const sidebarWidth = 200;

const BlocksView: FC<{ props: any }> = ({ props }) => {
  return (
    <div className='flex flex-1 grid grid-cols-5 grid-flow-row gap-2 p-2 overflow-y-scroll scrollbar'>
      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ProjectList />
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ContactList />
      </div>

      <div className='flex flex-shrink-0 row-span-2' style={props}>
        <TaskList />
      </div>

      <div className='flex flex-shrink-0' style={props}>
        <TaskList title='Completed Tasks' completed={true} readonly />
      </div>

      <div className='flex flex-shrink-0 col-span-3' style={props}>
        <ProjectGraph />
      </div>

      <div className='flex flex-shrink-0 col-span-3' style={props}>
        <Editor />
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ProjectTree />
      </div>
    </div>
  );
};

const ProjectsView: FC = () => {
  return <ProjectList />;
};

const TasksView: FC = () => {
  return <TaskList />;
};

const EditorView: FC = () => {
  return <Editor />;
};

const TestView = () => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  return (
    <div className='flex flex-1 flex-col bg-white'>
      <div className='flex m-4'>
        <SearchBar />
      </div>

      <div className='flex m-4'>
        <Selector options={projects.map((project) => ({ id: project[id], title: project.title }))} />
      </div>
    </div>
  );
};

/**
 * Main grid layout.
 */
const ViewContainer: FC<{ view: string }> = ({ view }) => {
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 24) / 2 } : {};

  return (
    <div ref={ref} className='full-screen'>
      <div className='flex flex-shrink-0' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>

      {view === AppView.CARDS && <BlocksView props={props} />}
      {view === AppView.PROJECTS && <ProjectsView />}
      {view === AppView.TASKS && <TasksView />}
      {view === AppView.EDITOR && <EditorView />}
      {view === AppView.TEST && <TestView />}
    </div>
  );
};

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const { views } = useOptions();
  const { spaceKey: currentSpaceKey, view } = useParams();
  const spaces = useSpaces();
  const [context, setContext] = useState<SpaceContextType | undefined>();

  useEffect(() => {
    if (!view || !viewConfig[view]) {
      navigate(`/${currentSpaceKey}/${views[0]}`);
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
