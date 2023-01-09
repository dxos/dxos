//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';

import {
  ChessGrid,
  ContactTable,
  OrganizationHierarchy,
  ProjectEditor,
  ProjectGraph,
  ProjectKanban,
  ProjectList,
  TaskList
} from '../../containers';
import {
  AppStateProvider,
  AppView,
  SpaceContext,
  SpaceContextType,
  useAppState,
  useOptions,
  viewConfig
} from '../../hooks';
import { AppBar } from './AppBar';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';

const sidebarWidth = 6 * (24 + 8) + 16;

/**
 * Main grid layout.
 */
const ViewContainer: FC<{ view: string }> = ({ view }) => {
  const { showSidebar } = useAppState();

  return (
    <div className='full-screen bg-gray-50'>
      <AppBar />

      <div className='flex flex-1 overflow-hidden'>
        {showSidebar && (
          <div className='flex flex-shrink-0' style={{ width: sidebarWidth }}>
            <Sidebar />
          </div>
        )}

        <div className='flex flex-1 overflow-y-scroll bg-white'>
          {view === AppView.DASHBOARD && <Dashboard />}
          {view === AppView.ORGS && <OrganizationHierarchy />}
          {view === AppView.PROJECTS && <ProjectList />}
          {view === AppView.CONTACTS && <ContactTable />}
          {view === AppView.KANBAN && <ProjectKanban />}
          {view === AppView.TASKS && <TaskList />}
          {view === AppView.EDITOR && <ProjectEditor />}
          {view === AppView.GRAPH && <ProjectGraph />}
          {view === AppView.GAME && <ChessGrid />}
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
    <AppStateProvider>
      <SpaceContext.Provider value={context}>
        {view && <ViewContainer view={view} />}
      </SpaceContext.Provider>
    </AppStateProvider>
  );
};
