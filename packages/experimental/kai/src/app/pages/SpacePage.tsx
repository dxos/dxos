//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { useNavigate, useParams } from 'react-router-dom';
import { Column } from 'react-table';

import { EchoObject, id } from '@dxos/echo-schema';
import { useQuery, useSpaces, withReactor } from '@dxos/react-client';

import { Card, FolderHierarchy, SearchBar, Selector, Table } from '../../components';
import {
  ContactList,
  Editor,
  mapProjectToItem,
  ProjectGraph,
  ProjectKanban,
  ProjectList,
  ProjectTree,
  Sidebar,
  TaskList
} from '../../containers';
import { AppView, SpaceContext, SpaceContextType, useOptions, useSpace, viewConfig } from '../../hooks';
import { Generator, Contact, Project } from '../../proto';

const sidebarWidth = 6 * (24 + 8) + 16;

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

const TestView = withReactor(() => {
  const { space } = useSpace();
  const contacts = useQuery(space, Contact.filter());
  const projects = useQuery(space, Project.filter());
  const generator = useMemo(() => (space ? new Generator(space.experimental.db) : undefined), [space]);
  useEffect(() => {
    if (projects.length === 0 || contacts.length === 0) {
      void generator?.generate();
    }
  }, [generator]);

  const columns = useMemo<Column<EchoObject>[]>(
    () => [
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'Username', accessor: 'username' as any },
      { Header: 'Email', accessor: 'email' as any },
      { Header: 'ZIP', accessor: 'address.zip' as any, maxWidth: 80 }
    ],
    []
  );

  const items = useMemo(() => projects.map((project) => mapProjectToItem(project)), [contacts]);

  return (
    <Card title='Experiments' className='bg-teal-400' scrollbar>
      <div className='flex m-4'>
        <div className='flex flex-1'>
          <SearchBar />
        </div>

        <div className='w-8'></div>

        <div className='flex flex-1'>
          <Selector options={contacts.map((contact) => ({ id: contact[id], title: contact.name }))} />
        </div>
      </div>

      <div className='flex mt-4 mb-4'>
        <FolderHierarchy items={items} />
      </div>

      <div className='flex mt-4'>
        <Table columns={columns} data={contacts} />
      </div>
    </Card>
  );
});

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
      {view === AppView.PROJECTS && <ProjectList />}
      {view === AppView.KANBAN && <ProjectKanban />}
      {view === AppView.TASKS && <TaskList />}
      {view === AppView.EDITOR && <Editor />}
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
