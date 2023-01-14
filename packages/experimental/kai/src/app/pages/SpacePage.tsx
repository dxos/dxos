//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import {
  ChessGrid,
  MetaTable,
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
import { ManageSpacePage } from './ManageSpacePage';
import { Sidebar } from './Sidebar';

/**
 * Main grid layout.
 */
const ViewContainer: FC<{ view: string }> = ({ view }) => {
  const { views } = useOptions();

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        fixedBlockStart: { children: <AppBar />, className: 'bg-orange-400' },
        content: { children: <Sidebar /> }
      }}
    >
      {views.length > 1 && <ViewSelector />}
      <div className={mx(views.length > 1 ? 'pbs-[84px]' : 'pbs-[48px]', 'flex h-screen bg-white')}>
        {view === AppView.SETTINGS && <ManageSpacePage />}
        {view === AppView.DASHBOARD && <Dashboard />}
        {view === AppView.META && <MetaTable />}
        {view === AppView.PROJECTS && <ProjectList />}
        {view === AppView.TASKS && <TaskList />}
        {view === AppView.ORGS && <OrganizationHierarchy />}
        {view === AppView.KANBAN && <ProjectKanban />}
        {view === AppView.EDITOR && <ProjectEditor />}
        {view === AppView.GRAPH && <ProjectGraph />}
        {view === AppView.MAP && <MapView />}
        {view === AppView.GAME && <ChessGrid />}
      </div>
    </PanelSidebarProvider>
  );
};

// let lastSpace;

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const { views } = useOptions();

  const [context, setContext] = useState<SpaceContextType | undefined>();
  // const space = useMemo(
  //   () => (currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined),
  //   [spaces, currentSpaceKey]
  // );

  const { spaceKey: currentSpaceKey, view } = useParams();
  const spaces = useSpaces();
  const space = currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined;

  // console.log('>>>>>>>>>>> SpacePage', space?.key.truncate(), space === lastSpace);
  // lastSpace = space;

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
