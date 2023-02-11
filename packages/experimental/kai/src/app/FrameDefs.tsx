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
    module: {
      id: FrameID.STACK,
      type: 'dxos.module.frame',
      displayName: 'Stack',
      description: 'Configurable tiles.'
    },
    runtime: {
      Icon: Stack,
      Component: StackFrame
    }
  },
  {
    module: {
      id: FrameID.TABLE,
      type: 'dxos.module.frame',
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
      id: FrameID.KANBAN,
      type: 'dxos.module.frame',
      displayName: 'Kanban',
      description: 'Card based process management.'
    },
    runtime: {
      Icon: KanbanIcon,
      Component: Kanban.Frame,
      Tile: Kanban.Tile
    }
  },
  {
    module: {
      id: FrameID.TASK,
      type: 'dxos.module.frame',
      displayName: 'Tasks',
      description: 'Project and task management tools.'
    },
    runtime: {
      Icon: ListChecks,
      Component: TaskFrame
    }
  },
  {
    module: {
      id: FrameID.CALENDAR,
      type: 'dxos.module.frame',
      displayName: 'Events',
      description: 'Calendar and time management tools.'

    },
    runtime: {
      Icon: Calendar,
      Component: CalendarFrame
    }
  },
  {
    module: {
      id: FrameID.DOCUMENT,
      type: 'dxos.module.frame',
      displayName: 'Documents',
      description: 'Realtime structured document editing.'
    },
    runtime: {
      Icon: Article,
      Component: DocumentFrame
    }
  },
  {
    module: {
      id: FrameID.NOTE,
      type: 'dxos.module.frame',
      displayName: 'Notes',
      description: 'Brainstorming notes.'

    },
    runtime: {
      Icon: Cards,
      Component: NoteFrame
    }
  },
  {
    module: {
      id: FrameID.FILE,
      type: 'dxos.module.frame',
      displayName: 'Files',
      description: 'Distributed file sharing.'
    },
    runtime: {
      Icon: Files,
      Component: FileFrame
    }
  },
  {
    module: {
      id: FrameID.SKETCH,
      type: 'dxos.module.frame',
      displayName: 'Sketch',
      description: 'Simple sketches.'
    },
    runtime: {
      Icon: HighlighterCircle,
      Component: SketchFrame
    }
  },
  {
    module: {
      id: FrameID.EXPLORER,
      type: 'dxos.module.frame',
      displayName: 'Explorer',
      description: 'Graphical User Interface and Data Explorer (GUIDE).'
    },
    runtime: {
      Icon: Graph,
      Component: ExplorerFrame
    }
  },
  {
    module: {
      id: FrameID.MAPS,
      type: 'dxos.module.frame',
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
      id: FrameID.CHESS,
      type: 'dxos.module.frame',
      displayName: 'Chess',
      description: 'Peer-to-peer and engine powered games.'
    },
    runtime: {
      Icon: Sword,
      Component: ChessFrame
    }
  },
  {
    module: {
      id: FrameID.SANDBOX,
      type: 'dxos.module.frame',
      displayName: 'Sandbox',
      description: 'Collaborative code sandbox.'
    },
    runtime: {
      Icon: Code,
      Component: SandboxFrame
    }
  }
];
