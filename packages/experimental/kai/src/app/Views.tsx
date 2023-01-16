//
// Copyright 2022 DXOS.org
//

import {
  Article,
  Calendar,
  Compass,
  Gear,
  Graph,
  Kanban,
  ListChecks,
  Sword,
  Table,
  TreeStructure,
  Wall
} from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { mx, getSize, useMediaQuery } from '@dxos/react-components';
import { PanelSidebarProvider, PanelSidebarContext } from '@dxos/react-ui';

// TODO(burdon): Rename views.
import {
  CalendarView,
  ChessView,
  Dashboard,
  MetaTable,
  MapView,
  OrganizationHierarchy,
  ProjectEditor,
  ProjectGraph,
  ProjectKanban,
  TaskList
} from '../containers';
import { useOptions } from '../hooks';
import { ManageSpacePage } from '../pages';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';

// TODO(burdon): Co-locate with routes.

export enum AppView {
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
  META = 'data',
  KANBAN = 'kanban',
  TASKS = 'tasks',
  ORGS = 'org',
  CALENDAR = 'events',
  EDITOR = 'documents',
  GRAPH = 'graph',
  MAP = 'map',
  GAME = 'game'
}

export const views = [
  AppView.DASHBOARD,
  AppView.META,
  AppView.KANBAN,
  AppView.CALENDAR,
  AppView.TASKS,
  AppView.ORGS,
  AppView.GRAPH,
  AppView.EDITOR,
  AppView.MAP,
  AppView.GAME
];

export const viewConfig: { [key: string]: { Icon: any; Component: any } } = {
  [AppView.SETTINGS]: { Icon: Gear, Component: ManageSpacePage },
  [AppView.DASHBOARD]: { Icon: Wall, Component: Dashboard },
  [AppView.META]: { Icon: Table, Component: MetaTable },
  [AppView.KANBAN]: { Icon: Kanban, Component: ProjectKanban },
  [AppView.TASKS]: { Icon: ListChecks, Component: TaskList },
  [AppView.ORGS]: { Icon: TreeStructure, Component: OrganizationHierarchy },
  [AppView.CALENDAR]: { Icon: Calendar, Component: CalendarView },
  [AppView.EDITOR]: { Icon: Article, Component: ProjectEditor },
  [AppView.GRAPH]: { Icon: Graph, Component: ProjectGraph },
  [AppView.MAP]: { Icon: Compass, Component: MapView },
  [AppView.GAME]: { Icon: Sword, Component: ChessView }
};

export const ViewSelector: FC = () => {
  const navigate = useNavigate();
  const { views } = useOptions();
  const { spaceKey: currentSpaceKey, view: currentView } = useParams();
  const { displayState } = useContext(PanelSidebarContext); // TODO(burdon): Context lags.
  const isOpen = displayState === 'show';
  const [isLg] = useMediaQuery('lg');

  const setView = (spaceKey: string, view: string) => {
    navigate(`/${spaceKey}/${view}`);
  };

  return (
    <div
      className={mx(
        'flex flex-col flex-1 bg-orange-500 pt-1 fixed inline-end-0 block-start-[48px] z-[1] transition-[inset-inline-start] duration-200 ease-in-out',
        isLg && isOpen ? 'inline-start-[272px]' : 'inline-start-0'
      )}
    >
      <div className='flex pl-2'>
        {views.map((view) => {
          const { Icon } = viewConfig[view];
          return (
            <a
              key={view}
              className={mx(
                'flex p-1 pl-2 lg:pr-2 lg:mr-2 items-center cursor-pointer rounded-t text-black text-sm',
                view === currentView && 'bg-white'
              )}
              onClick={() => setView(currentSpaceKey!, view)}
            >
              <Icon weight='light' className={getSize(6)} />
              <div className='hidden lg:flex ml-1'>{String(view)}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export const ViewContainer: FC<{ view: string }> = ({ view }) => {
  const { views } = useOptions();
  const { Component } = viewConfig[view];

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
        <Component />
      </div>
    </PanelSidebarProvider>
  );
};
