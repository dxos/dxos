//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { PanelSidebarProvider } from '@dxos/react-ui';

import {
  ChessGrid,
  ContactTable,
  MapView,
  OrganizationHierarchy,
  ProjectEditor,
  ProjectGraph,
  ProjectKanban,
  ProjectList,
  TaskList
} from '../../containers';
import { AppStateProvider, AppView, SpaceContext, SpaceContextType, useOptions, viewConfig } from '../../hooks';
import { AppBar, ViewSelector } from './AppBar';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';

/**
 * Main grid layout.
 */
const ViewContainer: FC<{ view: string }> = ({ view }) => {
  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        fixedBlockStart: { children: <AppBar />, className: 'bg-orange-400' },
        content: { children: <Sidebar /> }
      }}
    >
      <ViewSelector />
      <div className='pbs-[84px]'>
        {view === AppView.DASHBOARD && <Dashboard />}
        {view === AppView.ORGS && <OrganizationHierarchy />}
        {view === AppView.PROJECTS && <ProjectList />}
        {view === AppView.CONTACTS && <ContactTable />}
        {view === AppView.KANBAN && <ProjectKanban />}
        {view === AppView.TASKS && <TaskList />}
        {view === AppView.EDITOR && <ProjectEditor />}
        {view === AppView.GRAPH && <ProjectGraph />}
        {view === AppView.MAP && <MapView />}
        {view === AppView.GAME && <ChessGrid />}
      </div>
    </PanelSidebarProvider>
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
