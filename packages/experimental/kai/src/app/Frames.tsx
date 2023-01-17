//
// Copyright 2022 DXOS.org
//

import { Article, Calendar, Compass, Gear, Globe, Graph, Kanban, ListChecks, Sword, Table, Wall } from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { mx, getSize } from '@dxos/react-components';
import { PanelSidebarProvider, PanelSidebarContext } from '@dxos/react-ui';

// TODO(burdon): Rename views.
import {
  CalendarView,
  ChessView,
  Dashboard,
  DMGView,
  MetaTable,
  MapView,
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
  { id: FrameID.DMG, title: 'Registry', Icon: Globe, Component: DMGView, system: true },
  { id: FrameID.DASHBOARD, title: 'Dashboard', Icon: Wall, Component: Dashboard },
  { id: FrameID.TABLE, title: 'Table', Icon: Table, Component: MetaTable },
  { id: FrameID.KANBAN, title: 'Kanban', Icon: Kanban, Component: ProjectKanban },
  { id: FrameID.TASKS, title: 'Tasks', Icon: ListChecks, Component: TaskList },
  { id: FrameID.CALENDAR, title: 'Events', Icon: Calendar, Component: CalendarView },
  { id: FrameID.DOCUMENTS, title: 'Documents', Icon: Article, Component: ProjectEditor },
  { id: FrameID.EXPLORER, title: 'Explorer', Icon: Graph, Component: ProjectGraph },
  { id: FrameID.MAPS, title: 'Maps', Icon: Compass, Component: MapView },
  { id: FrameID.CHESS, title: 'Chess', Icon: Sword, Component: ChessView }
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
        'flex flex-col flex-1 bg-orange-500 pt-1 fixed inline-end-0 block-start-[48px] z-[1] transition-[inset-inline-start] duration-200 ease-in-out',
        isOpen ? 'inline-start-0 lg:inline-start-[272px]' : 'inline-start-0'
      )}
    >
      <div className='flex pl-2'>
        {frames
          .filter(({ system }) => !system)
          .map(({ id, title, Icon }) => {
            return (
              <a
                key={id}
                className={mx(
                  'flex p-1 pl-2 lg:pr-2 lg:mr-2 items-center cursor-pointer rounded-t text-black text-sm',
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
        content: { children: <Sidebar />, className: 'block-start-[48px]' },
        main: {
          className: mx(
            frames.length > 1 ? 'pbs-[84px]' : 'pbs-[48px]',
            'min-bs-screen max-bs-screen flex flex-col bg-white'
          )
        }
      }}
    >
      <AppBar />
      <FrameSelector />
      {Component && <Component />}
    </PanelSidebarProvider>
  );
};
