//
// Copyright 2023 DXOS.org
//

import { Bag, Buildings, Calendar, Check, Envelope, FileText, UserCircle } from '@phosphor-icons/react';
import { FC } from 'react';

import { Module } from '@dxos/protocols/proto/dxos/config';

// TODO(burdon): Implement packlets for frames.

import { FrameDef, FrameRuntime } from '../registry';
import { CalendarFrameRuntime } from './Calendar';
import { ChatFrameRuntime } from './Chat';
import { ChessFrameRuntime } from './Chess';
import { ContactFrameRuntime } from './Contact';
import { DocumentFrameRuntime } from './Document';
import { ExplorerFrameRuntime } from './Explorer';
import { FileFrameRuntime } from './File';
import { KanbanFrameRuntime } from './Kanban';
import { MapFrameRuntime } from './Map';
import { MessageFrameRuntime } from './Message';
import { NoteFrameRuntime } from './Note';
import { PresenterFrameRuntime } from './Presenter';
import { SandboxFrameRuntime } from './Sandbox';
import { SketchFrameRuntime } from './Sketch';
import { StackFrameRuntime } from './Stack';
import { TableFrameRuntime } from './Table';
import { TaskFrameRuntime } from './Task';

/**
 * DMG registry modules.
 */
export const frameModules: Module[] = [
  {
    id: 'dxos.module.frame.contact',
    type: 'dxos:type/frame',
    displayName: 'Contacts',
    description: 'Address book.'
  },
  {
    id: 'dxos.module.frame.table',
    type: 'dxos:type/frame',
    displayName: 'Table',
    description: 'Generic data browser.'
  },
  {
    id: 'dxos.module.frame.kanban',
    type: 'dxos:type/frame',
    displayName: 'Kanban',
    description: 'Card based pipelines.'
  },
  {
    id: 'dxos.module.frame.task',
    type: 'dxos:type/frame',
    displayName: 'Tasks',
    description: 'Projects and task management.'
  },
  {
    id: 'dxos.module.frame.inbox',
    type: 'dxos:type/frame',
    displayName: 'Inbox',
    description: 'Universal message inbox.'
  },
  {
    id: 'dxos.module.frame.chat',
    type: 'dxos:type/frame',
    displayName: 'Chat',
    description: 'Real time messaging.'
  },
  {
    id: 'dxos.module.frame.calendar',
    type: 'dxos:type/frame',
    displayName: 'Calendar',
    description: 'Calendar and time management tools.'
  },
  {
    id: 'dxos.module.frame.document',
    type: 'dxos:type/frame',
    displayName: 'Documents',
    description: 'Realtime structured document editing.'
  },
  {
    id: 'dxos.module.frame.stack',
    type: 'dxos:type/frame',
    displayName: 'Stacks',
    description: 'Dynamic structured documents.'
  },
  {
    id: 'dxos.module.frame.presenter',
    type: 'dxos:type/frame',
    displayName: 'Presenter',
    description: 'Slide presentations.'
  },
  {
    id: 'dxos.module.frame.note',
    type: 'dxos:type/frame',
    displayName: 'Notes',
    description: 'Brainstorming notes.'
  },
  {
    id: 'dxos.module.frame.file',
    type: 'dxos:type/frame',
    displayName: 'Files',
    description: 'Distributed file sharing.'
  },
  {
    id: 'dxos.module.frame.sketch',
    type: 'dxos:type/frame',
    displayName: 'Sketch',
    description: 'Vector drawings.'
  },
  {
    id: 'dxos.module.frame.explorer',
    type: 'dxos:type/frame',
    displayName: 'Explorer',
    description: 'Graphical User Interface and Data Explorer.'
  },
  {
    id: 'dxos.module.frame.maps',
    type: 'dxos:type/frame',
    displayName: 'Maps',
    description: 'Community contributed street maps.'
  },
  {
    id: 'dxos.module.frame.chess',
    type: 'dxos:type/frame',
    displayName: 'Games',
    description: 'Peer-to-peer and engine powered games.'
  },
  {
    id: 'dxos.module.frame.sandbox',
    type: 'dxos:type/frame',
    displayName: 'Script',
    description: 'Frame and Bot script editor.'
  }
];

/**
 * Dynamic binding of DMG metadata with runtime defs.
 */
// TODO(burdon): Rethink frame binding (e.g., currently FrameRuntime has a single generic type).
export const frameRuntime: { [type: string]: FrameRuntime<any> } = {
  'dxos.module.frame.contact': ContactFrameRuntime,
  'dxos.module.frame.table': TableFrameRuntime,
  'dxos.module.frame.kanban': KanbanFrameRuntime,
  'dxos.module.frame.task': TaskFrameRuntime,
  'dxos.module.frame.inbox': MessageFrameRuntime,
  'dxos.module.frame.chat': ChatFrameRuntime,
  'dxos.module.frame.calendar': CalendarFrameRuntime,
  'dxos.module.frame.document': DocumentFrameRuntime,
  'dxos.module.frame.stack': StackFrameRuntime,
  'dxos.module.frame.presenter': PresenterFrameRuntime,
  'dxos.module.frame.note': NoteFrameRuntime,
  'dxos.module.frame.file': FileFrameRuntime,
  'dxos.module.frame.sketch': SketchFrameRuntime,
  'dxos.module.frame.explorer': ExplorerFrameRuntime,
  'dxos.module.frame.maps': MapFrameRuntime,
  'dxos.module.frame.chess': ChessFrameRuntime,
  'dxos.module.frame.sandbox': SandboxFrameRuntime
};

/**
 * Combination of Metagraph module proto defs and runtime component defs (which would be dynamically loaded).
 */
export const frameDefs: FrameDef<any>[] = Object.entries(frameRuntime).map(([type, runtime]) => ({
  module: frameModules.find((module) => module.id === type)!,
  runtime
}));

type SearchMeta = {
  rank: number;
  Icon: FC<any>;
  frame?: FrameDef<any>;
};

// TODO(burdon): Bind icons (metadata).
// TODO(burdon): Inject into provider.
// TODO(burdon): Reconcile with type and frame system.
export const searchMeta: { [type: string]: SearchMeta } = {
  'dxos.experimental.kai.Organization': {
    rank: 3,
    Icon: Buildings
  },
  'dxos.experimental.kai.Project': {
    rank: 1,
    Icon: Bag
  },
  'dxos.experimental.kai.Task': {
    rank: 1,
    Icon: Check
  },
  'dxos.experimental.kai.Contact': {
    rank: 3,
    Icon: UserCircle,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.contact')
  },
  'dxos.experimental.kai.Event': {
    rank: 1,
    Icon: Calendar,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.calendar')
  },
  'dxos.experimental.kai.Document': {
    rank: 2,
    Icon: FileText,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.document')
  },
  'dxos.experimental.kai.DocumentStack': {
    rank: 2,
    Icon: FileText,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.stack')
  },
  'dxos.experimental.kai.Message': {
    rank: 1,
    Icon: Envelope,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.inbox')
  }
};
