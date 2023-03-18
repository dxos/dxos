//
// Copyright 2023 DXOS.org
//

import {
  Article,
  Calendar,
  Cards,
  Code,
  Compass,
  Files,
  Graph,
  HighlighterCircle,
  Kanban as KanbanIcon,
  ListChecks,
  Stack as StackIcon,
  Sword,
  Table,
  Tray,
  MagnifyingGlass,
  IdentificationCard
} from '@phosphor-icons/react';

import { Module } from '@dxos/protocols/proto/dxos/config';

import {
  FrameDef,
  CalendarFrame,
  ChessFrame,
  ContactFrame,
  Document as DocumentFrame,
  ExplorerFrame,
  File,
  KanbanFrame,
  MapFrame,
  MessageFrame,
  Note,
  SandboxFrame,
  SearchFrame,
  SketchFrame,
  Stack,
  TableFrame,
  TaskFrame
} from '../frames';
import { PresenterFrameRuntime } from './Presenter';

// TODO(burdon): Metagraph.

/**
 * Combination of Metagraph module proto defs and runtime component defs (which would be dynamically loaded).
 */
export const frameDefs: FrameDef<any>[] = [
  {
    module: {
      id: 'dxos.module.frame.search',
      type: 'dxos:type/frame',
      displayName: 'Search',
      description: 'Universal search.'
    },
    runtime: {
      Icon: MagnifyingGlass,
      Component: SearchFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.contact',
      type: 'dxos:type/frame',
      displayName: 'Contacts',
      description: 'Address book.'
    },
    runtime: {
      Icon: IdentificationCard,
      Component: ContactFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.table',
      type: 'dxos:type/frame',
      displayName: 'Table',
      description: 'Generic data browser.'
    },
    runtime: {
      Icon: Table,
      Component: TableFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.kanban',
      type: 'dxos:type/frame',
      displayName: 'Kanban',
      description: 'Card based pipelines.'
    },
    runtime: {
      Icon: KanbanIcon,
      Component: KanbanFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.task',
      type: 'dxos:type/frame',
      displayName: 'Tasks',
      description: 'Projects and task management.'
    },
    runtime: {
      Icon: ListChecks,
      Component: TaskFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.inbox',
      type: 'dxos:type/frame',
      displayName: 'Inbox',
      description: 'Universal message inbox.'
    },
    runtime: {
      Icon: Tray,
      Component: MessageFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.calendar',
      type: 'dxos:type/frame',
      displayName: 'Calendar',
      description: 'Calendar and time management tools.'
    },
    runtime: {
      Icon: Calendar,
      Component: CalendarFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.document',
      type: 'dxos:type/frame',
      displayName: 'Documents',
      description: 'Realtime structured document editing.'
    },
    runtime: {
      Icon: Article,
      Component: DocumentFrame.Frame,
      List: DocumentFrame.List
    }
  },
  {
    module: {
      id: 'dxos.module.frame.stack',
      type: 'dxos:type/frame',
      displayName: 'Stacks',
      description: 'Dynamic structured documents.'
    },
    runtime: {
      Icon: StackIcon,
      Component: Stack.Frame,
      List: Stack.List
    }
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
    runtime: {
      Icon: Cards,
      Component: Note.Frame,
      List: Note.List
    }
  },
  {
    module: {
      id: 'dxos.module.frame.file',
      type: 'dxos:type/frame',
      displayName: 'Files',
      description: 'Distributed file sharing.'
    },
    runtime: {
      Icon: Files,
      Component: File.Frame,
      List: File.List
    }
  },
  {
    module: {
      id: 'dxos.module.frame.sketch',
      type: 'dxos:type/frame',
      displayName: 'Sketch',
      description: 'Vector drawings.'
    },
    runtime: {
      Icon: HighlighterCircle,
      Component: SketchFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.explorer',
      type: 'dxos:type/frame',
      displayName: 'Explorer',
      description: 'Graphical User Interface and Data Explorer.'
    },
    runtime: {
      Icon: Graph,
      Component: ExplorerFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.maps',
      type: 'dxos:type/frame',
      displayName: 'Maps',
      description: 'Community contributed street maps.'
    },
    runtime: {
      Icon: Compass,
      Component: MapFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.chess',
      type: 'dxos:type/frame',
      displayName: 'Games',
      description: 'Peer-to-peer and engine powered games.'
    },
    runtime: {
      Icon: Sword,
      Component: ChessFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.sandbox',
      type: 'dxos:type/frame',
      displayName: 'Script',
      description: 'Frame and Bot script editor.'
    },
    runtime: {
      Icon: Code,
      Component: SandboxFrame
    }
  }
];

export const frameModules: Module[] = frameDefs.map(({ module }) => module);
