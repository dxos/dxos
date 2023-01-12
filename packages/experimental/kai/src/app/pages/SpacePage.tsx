//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC, useMemo } from 'react';
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
import { createSpacePath, matchSpaceKey } from '../Routes';
import { AppBar, ViewSelector } from './AppBar';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';

const appBarHeight = 84;

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
      {/* TODO(burdon): Disable scrollbar. */}
      <ViewSelector />
      <div className={`pbs-[${appBarHeight}px] flex h-screen bg-white`}>
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
  const [context, setContext] = useState<SpaceContextType | undefined>();
  const navigate = useNavigate();
  const { views } = useOptions();
  const { spaceKey: currentSpaceKey, view } = useParams();
  const spaces = useSpaces();
  const space = useMemo(
    () => (currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined),
    [spaces, currentSpaceKey]
  );

  // Change space.
  useEffect(() => {
    if (space) {
      setContext({ space });
    } else {
      navigate('/');
    }
  }, [space]);

  // Change view.
  useEffect(() => {
    if (space && (!view || !viewConfig[view])) {
      navigate(createSpacePath(space.key, views[0]));
    }
  }, [view, currentSpaceKey]);

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
