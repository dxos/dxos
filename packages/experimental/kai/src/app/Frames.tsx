//
// Copyright 2022 DXOS.org
//

import {
  Article,
  Calendar,
  CaretLeft,
  CaretRight,
  Compass,
  Files,
  Stack,
  Gear,
  Globe,
  Graph,
  HighlighterCircle,
  Kanban,
  ListChecks,
  Sword,
  Table
} from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

// TODO(burdon): Rename frames.
import {
  CalendarFrame,
  ChessFrame,
  StackFrame,
  DocumentFrame,
  ExplorerFrame,
  FileFrame,
  KanbanFrame,
  MapFrame,
  RegistryFrame,
  SketchFrame,
  TableFrame,
  TasksFrame
} from '../containers';
import { FrameID, FrameDef, useActiveFrames, useSpace, createSpacePath } from '../hooks';
import { ManageSpacePage } from '../pages';

// prettier-ignore
export const frames: FrameDef[] = [
  {
    id: FrameID.SETTINGS,
    title: 'Settings',
    Icon: Gear,
    Component: ManageSpacePage,
    system: true
  },
  {
    id: FrameID.REGISTRY,
    title: 'Registry',
    Icon: Globe,
    Component: RegistryFrame,
    system: true
  },
  {
    id: FrameID.STACK,
    title: 'Stack',
    description: 'Configurable tiles.',
    Icon: Stack,
    Component: StackFrame
  },
  {
    id: FrameID.TABLE,
    title: 'Table',
    description: 'Generic data browser.',
    Icon: Table,
    Component: TableFrame
  },
  {
    id: FrameID.KANBAN,
    title: 'Kanban',
    description: 'Card based process management.',
    Icon: Kanban,
    Component: KanbanFrame
  },
  {
    id: FrameID.TASKS,
    title: 'Tasks',
    description: 'Project and task management tools.',
    Icon: ListChecks,
    Component: TasksFrame
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
    Component: DocumentFrame
  },
  {
    id: FrameID.FILES,
    title: 'Files',
    description: 'Distributed file sharing.',
    Icon: Files,
    Component: FileFrame
  },
  {
    id: FrameID.SKETCH,
    title: 'Sketch',
    description: 'Simple sketches.',
    Icon: HighlighterCircle,
    Component: SketchFrame
  },
  {
    id: FrameID.EXPLORER,
    title: 'Explorer',
    description: 'Graphical data navigator.',
    Icon: Graph,
    Component: ExplorerFrame
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
  const space = useSpace();
  const frames = useActiveFrames();
  const { frame: currentFrame } = useParams();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const toggleSidebar = useTogglePanelSidebar();

  // TODO(burdon): Make larger for mobile.
  return (
    <div
      className={mx(
        'flex flex-col-reverse bg-orange-500',
        'fixed inline-end-0 block-start-appbar bs-framepicker transition-[inset-inline-start] duration-200 ease-in-out z-[1]',
        isOpen ? 'inline-start-0 lg:inline-start-sidebar' : 'inline-start-0'
      )}
    >
      <div className='flex pl-3'>
        <button className='mr-2' onClick={toggleSidebar}>
          {isOpen ? <CaretLeft className={getSize(6)} /> : <CaretRight className={getSize(6)} />}
        </button>

        {frames
          .filter(({ system }) => !system)
          .map(({ id, title, Icon }) => {
            return (
              <a
                key={id}
                className={mx(
                  'flex p-1 px-2 lg:mr-2 items-center cursor-pointer rounded-t text-black',
                  id === currentFrame && 'bg-white'
                )}
                onClick={() => navigate(createSpacePath(space.key, id))}
              >
                <div className='px-2 md:px-0'>
                  <Icon weight='light' className={getSize(6)} />
                </div>
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
 * Viewport for frame.
 */
export const FrameContainer: FC<{ frame: string }> = ({ frame }) => {
  const frames = useActiveFrames();
  const active = frames.find(({ id }) => id === frame);
  const { Component } = active ?? {};
  if (!Component) {
    return null;
  }

  return <Component />;
};
