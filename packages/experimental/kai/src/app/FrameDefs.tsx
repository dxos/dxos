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
  Graph,
  HighlighterCircle,
  Kanban as KanbanIcon,
  ListChecks,
  Sword,
  Table,
  Code
} from 'phosphor-react';

import {
  CalendarFrame,
  ChessFrame,
  StackFrame,
  DocumentFrame,
  ExplorerFrame,
  FileFrame,
  Kanban,
  MapFrame,
  NoteFrame,
  SketchFrame,
  TableFrame,
  TaskFrame,
  SandboxFrame
} from '../frames';
import { FrameID, FrameDef } from '../hooks';

// prettier-ignore
export const frames: FrameDef[] = [
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
    Icon: KanbanIcon,
    Component: Kanban.Frame,
    Tile: Kanban.Tile
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
