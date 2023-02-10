//
// Copyright 2022 DXOS.org
//

import {
  Article,
  Calendar,
  Cards,
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
  Table,
  Code,
  CaretRight
} from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';

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
  NoteFrame,
  RegistryFrame,
  SketchFrame,
  TableFrame,
  TaskFrame,
  SandboxFrame
} from '../frames';
import { FrameID, FrameDef, useActiveFrames, useSpace, createSpacePath } from '../hooks';
import { ManageSpacePage } from '../pages';

// prettier-ignore
export const frameSelector: FrameDef[] = [
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
    id: FrameID.TASK,
    title: 'Tasks',
    description: 'Project and task management tools.',
    Icon: ListChecks,
    Component: TaskFrame
  },
  {
    id: FrameID.CALENDAR,
    title: 'Events',
    description: 'Calendar and time management tools.',
    Icon: Calendar,
    Component: CalendarFrame
  },
  {
    id: FrameID.DOCUMENT,
    title: 'Documents',
    description: 'Realtime structured document editing.',
    Icon: Article,
    Component: DocumentFrame
  },
  {
    id: FrameID.NOTE,
    title: 'Notes',
    description: 'Brainstorming notes.',
    Icon: Cards,
    Component: NoteFrame
  },
  {
    id: FrameID.FILE,
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
    description: 'Graphical User Interface and Data Explorer (GUIDE).',
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
  },
  {
    id: FrameID.SANDBOX,
    title: 'Sandbox',
    description: 'Collaborative code sandbox.',
    Icon: Code,
    Component: SandboxFrame
  }
];

/**
 * View tabs.
 */
export const FrameSelector: FC = () => {
  const space = useSpace();
  const frames = useActiveFrames();
  const { frame: currentFrame } = useParams();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const toggleSidebar = useTogglePanelSidebar();

  const Tab: FC<{ selected: boolean; title: string; Icon: FC<any>; link: string }> = ({
    selected,
    title,
    Icon,
    link
  }) => {
    return (
      <div
        className={mx('flex p-1 px-2 lg:mr-2 items-center cursor-pointer rounded-t text-black', selected && 'bg-white')}
      >
        <Link className='flex' to={link} title={title}>
          <Icon weight='light' className={getSize(6)} />
          <div className='hidden lg:flex ml-1'>{title}</div>
        </Link>
      </div>
    );
  };

  return (
    <div
      className={mx(
        'flex flex-col-reverse bg-appbar-toolbar',
        'fixed inline-end-0 block-start-appbar bs-toolbar transition-[inset-inline-start] duration-200 ease-in-out z-[1]',
        isOpen ? 'inline-start-0 lg:inline-start-sidebar' : 'inline-start-0'
      )}
    >
      <div className='flex justify-between'>
        <div className='flex items-center'>
          {!isOpen && (
            <button className='ml-5 mr-2' onClick={toggleSidebar}>
              {<CaretRight className={getSize(6)} />}
            </button>
          )}

          {frames
            .filter(({ system }) => !system)
            .map(({ id, title, Icon }) => (
              <Tab
                key={id}
                selected={id === currentFrame}
                title={title}
                Icon={Icon}
                link={createSpacePath(space.key, id)}
              />
            ))}
        </div>

        <div className='flex items-center mr-3'>
          <Tab selected={FrameID.REGISTRY === currentFrame} title='Registry' Icon={Globe} link={FrameID.REGISTRY} />
        </div>
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

  // TODO(burdon): Frame flicker on first display.
  return <Component />;
};
