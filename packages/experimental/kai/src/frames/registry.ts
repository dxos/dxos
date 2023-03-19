//
// Copyright 2023 DXOS.org
//

import { Module } from '@dxos/protocols/proto/dxos/config';

import { FrameDef } from '../registry';
import { CalendarFrameRuntime } from './Calendar';
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
import { SearchFrameRuntime } from './Search';
import { SketchFrameRuntime } from './Sketch';
import { StackFrameRuntime } from './Stack';
import { TableFrameRuntime } from './Table';
import { TaskFrameRuntime } from './Task';

/**
 * Combination of Metagraph module proto defs and runtime component defs (which would be dynamically loaded).
 */
// TODO(burdon): Metagraph registry with dynamic defs (loaded separately from frames).
export const frameDefs: FrameDef<any>[] = [
  {
    module: {
      id: 'dxos.module.frame.search',
      type: 'dxos:type/frame',
      displayName: 'Search',
      description: 'Universal search.'
    },
    runtime: SearchFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.contact',
      type: 'dxos:type/frame',
      displayName: 'Contacts',
      description: 'Address book.'
    },
    runtime: ContactFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.table',
      type: 'dxos:type/frame',
      displayName: 'Table',
      description: 'Generic data browser.'
    },
    runtime: TableFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.kanban',
      type: 'dxos:type/frame',
      displayName: 'Kanban',
      description: 'Card based pipelines.'
    },
    runtime: KanbanFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.task',
      type: 'dxos:type/frame',
      displayName: 'Tasks',
      description: 'Projects and task management.'
    },
    runtime: TaskFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.inbox',
      type: 'dxos:type/frame',
      displayName: 'Inbox',
      description: 'Universal message inbox.'
    },
    runtime: MessageFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.calendar',
      type: 'dxos:type/frame',
      displayName: 'Calendar',
      description: 'Calendar and time management tools.'
    },
    runtime: CalendarFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.document',
      type: 'dxos:type/frame',
      displayName: 'Documents',
      description: 'Realtime structured document editing.'
    },
    runtime: DocumentFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.stack',
      type: 'dxos:type/frame',
      displayName: 'Stacks',
      description: 'Dynamic structured documents.'
    },
    runtime: StackFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.presenter',
      type: 'dxos:type/frame',
      displayName: 'Presenter',
      description: 'Slide presentations.'
    },
    runtime: PresenterFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.note',
      type: 'dxos:type/frame',
      displayName: 'Notes',
      description: 'Brainstorming notes.'
    },
    runtime: NoteFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.file',
      type: 'dxos:type/frame',
      displayName: 'Files',
      description: 'Distributed file sharing.'
    },
    runtime: FileFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.sketch',
      type: 'dxos:type/frame',
      displayName: 'Sketch',
      description: 'Vector drawings.'
    },
    runtime: SketchFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.explorer',
      type: 'dxos:type/frame',
      displayName: 'Explorer',
      description: 'Graphical User Interface and Data Explorer.'
    },
    runtime: ExplorerFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.maps',
      type: 'dxos:type/frame',
      displayName: 'Maps',
      description: 'Community contributed street maps.'
    },
    runtime: MapFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.chess',
      type: 'dxos:type/frame',
      displayName: 'Games',
      description: 'Peer-to-peer and engine powered games.'
    },
    runtime: ChessFrameRuntime
  },
  {
    module: {
      id: 'dxos.module.frame.sandbox',
      type: 'dxos:type/frame',
      displayName: 'Script',
      description: 'Frame and Bot script editor.'
    },
    runtime: SandboxFrameRuntime
  }
];

// TODO(burdon): Create map of modules to runtime defs.
export const frameModules: Module[] = frameDefs.map(({ module }) => module);
