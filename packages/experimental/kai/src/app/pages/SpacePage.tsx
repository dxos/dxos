//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { useNavigate, useParams } from 'react-router-dom';
import { Column } from 'react-table';

import { EchoObject } from '@dxos/echo-schema';
import { useQuery, useSpaces } from '@dxos/react-client';

import { FolderHierarchy, Searchbar, Table } from '../../components';
import {
  AppBar,
  ContactList,
  Editor,
  mapProjectToItem,
  ProjectGraph,
  ProjectKanban,
  ProjectList,
  ProjectHierarchy,
  Sidebar,
  TaskList
} from '../../containers';
import { AppView, SpaceContext, SpaceContextType, useOptions, useSpace, viewConfig } from '../../hooks';
import { Contact, Project } from '../../proto';

const sidebarWidth = 6 * (24 + 8) + 16;

const DashboardView: FC<{}> = () => {
  // TODO(burdon): Move into block.
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 8) / 2 } : {};

  return (
    <div ref={ref} className='flex flex-1 grid grid-cols-5 grid-flow-row gap-4 p-4 overflow-y-scroll scrollbar'>
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
        <ProjectHierarchy />
      </div>
    </div>
  );
};

const OrgView = () => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());
  const items = useMemo(() => projects.map((project) => mapProjectToItem(project)), [projects]);
  return (
    <div className='flex flex-1 p-2 bg-white'>
      <FolderHierarchy items={items} />
    </div>
  );
};

const ContactsView = () => {
  const { space } = useSpace();
  const contacts = useQuery(space, Contact.filter());
  const columns = useMemo<Column<EchoObject>[]>(
    () => [
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'Username', accessor: 'username' as any },
      { Header: 'Email', accessor: 'email' as any },
      { Header: 'ZIP', accessor: 'address.zip' as any, maxWidth: 80 }
    ],
    []
  );

  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-white'>
      <div className='flex p-2'>
        <div>
          <Searchbar />
        </div>
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <Table columns={columns} data={contacts} />{' '}
      </div>
    </div>
  );
};

/**
 * Main grid layout.
 */
const ViewContainer: FC<{ view: string }> = ({ view }) => {
  return (
    <div className='full-screen bg-gray-50'>
      <AppBar />

      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-shrink-0' style={{ width: sidebarWidth }}>
          <Sidebar />
        </div>

        <div className='flex flex-1 overflow-y-scroll'>
          {view === AppView.DASHBOARD && <DashboardView />}
          {view === AppView.ORG && <OrgView />}
          {view === AppView.PROJECTS && <ProjectList />}
          {view === AppView.CONTACTS && <ContactsView />}
          {view === AppView.KANBAN && <ProjectKanban />}
          {view === AppView.TASKS && <TaskList />}
          {view === AppView.EDITOR && <Editor />}
          {view === AppView.GRAPH && <ProjectGraph />}
        </div>
      </div>
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
