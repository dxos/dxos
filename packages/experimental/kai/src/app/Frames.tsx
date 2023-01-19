//
// Copyright 2022 DXOS.org
//

import { Article, Calendar, Compass, Gear, Globe, Graph, Kanban, ListChecks, Sword, Table, Wall } from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { mx, getSize } from '@dxos/react-components';
import { PanelSidebarProvider, PanelSidebarContext } from '@dxos/react-ui';

// TODO(burdon): Rename frames.
import {
  CalendarFrame,
  ChessFrame,
  Dashboard,
  RegistryFrame,
  MapFrame,
  TableFrame,
  ProjectEditor,
  ProjectGraph,
  ProjectKanban,
  TaskList
} from '../containers';
import { FrameID, FrameDef, useActiveFrames, useSpace } from '../hooks';
import { ManageSpacePage } from '../pages';
import { AppBar } from './AppBar';
import { createSpacePath } from './Routes';
import { Sidebar } from './Sidebar';

export const frames: FrameDef[] = [
  { id: FrameID.SETTINGS, title: 'Settings', Icon: Gear, Component: ManageSpacePage, system: true },
  { id: FrameID.REGISTRY, title: 'Registry', Icon: Globe, Component: RegistryFrame, system: true },
  {
    id: FrameID.DASHBOARD,
    title: 'Dashboard',
    description: 'Customizable collection of data-bounds control.',
    Icon: Wall,
    Component: Dashboard
  },
  { id: FrameID.TABLE, title: 'Table', description: 'Generic data browser.', Icon: Table, Component: TableFrame },
  {
    id: FrameID.KANBAN,
    title: 'Kanban',
    description: 'Card based process management.',
    Icon: Kanban,
    Component: ProjectKanban
  },
  {
    id: FrameID.TASKS,
    title: 'Tasks',
    description: 'Project and task management tools.',
    Icon: ListChecks,
    Component: TaskList
  },
  {
    id: FrameID.CALENDAR,
    title: 'Events',
    description: 'Calendar and time management tools.',
    Icon: Calendar,
    Component: CalendarFrame
  },
  {
    id: FrameID.DOCUMENTS,
    title: 'Documents',
    description: 'Realtime structured document editing.',
    Icon: Article,
    Component: ProjectEditor
  },
  {
    id: FrameID.EXPLORER,
    title: 'Explorer',
    description: 'Graphical data navigator.',
    Icon: Graph,
    Component: ProjectGraph
  },
  {
    id: FrameID.MAPS,
    title: 'Maps',
    description: 'Community contributed street maps.',
    Icon: Compass,
    Component: MapFrame
  },
  {
    id: FrameID.CHESS,
    title: 'Chess',
    description: 'Peer-to-peer and engine powered games.',
    Icon: Sword,
    Component: ChessFrame
  }
];

/**
 * View tabs.
 */
export const FrameSelector: FC = () => {
  const navigate = useNavigate();
  const { space } = useSpace();
  const frames = useActiveFrames();
  const { frame: currentFrame } = useParams();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';

  return (
    <div
      className={mx(
        'flex flex-col-reverse bg-orange-500 fixed inline-end-0 block-start-appbar bs-framepicker z-[1] transition-[inset-inline-start] duration-200 ease-in-out',
        isOpen ? 'inline-start-0 lg:inline-start-sidebar' : 'inline-start-0'
      )}
    >
      <div className='flex pl-3'>
        {frames
          .filter(({ system }) => !system)
          .map(({ id, title, Icon }) => {
            return (
              <a
                key={id}
                className={mx(
                  'flex lg:pr-2 lg:mr-2 items-center p-1 cursor-pointer rounded-t text-black',
                  id === currentFrame && 'bg-white'
                )}
                onClick={() => navigate(createSpacePath(space.key, id))}
              >
                <Icon weight='light' className={getSize(6)} />
                <div className='hidden lg:flex ml-1'>{title}</div>
              </a>
            );
          })}
        <div className='flex-1' />
      </div>
    </div>
  );
};

/**
 * View main content.
 */
export const FrameContainer: FC<{ frame: string }> = ({ frame }) => {
  const frames = useActiveFrames();
  const active = frames.find(({ id }) => id === frame);
  const { Component } = active ?? {};

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        content: { children: <Sidebar />, className: 'block-start-appbar' },
        main: {
          className: mx(frames.length > 1 ? 'pbs-topbars' : 'pbs-appbar', 'bs-full overflow-hidden')
        }
      }}
    >
      <AppBar />
      <FrameSelector />
      <div role='none' className='bs-full overflow-auto overscroll-contain bg-white flex flex-col bg-white'>
        {Component && <Component />}
      </div>
    </PanelSidebarProvider>
  );
};
