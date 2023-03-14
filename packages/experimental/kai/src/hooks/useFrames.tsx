//
// Copyright 2022 DXOS.org
//

import {
  Article,
  Robot,
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
import assert from 'assert';
import { FC, useMemo } from 'react';

import { Module } from '@dxos/protocols/proto/dxos/config';
import { useModules } from '@dxos/react-metagraph';

import {
  BotFrame,
  CalendarFrame,
  ChessFrame,
  ContactFrame,
  Document,
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
import { useAppState } from './useAppState';

export type FrameDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    Component: FC<any>;
    List?: FC<any>;
  };
};

/**
 * Combination of Metagraph module proto defs and runtime component defs (which would be dynamically loaded).
 */
// prettier-ignore
export const frameDefs: FrameDef[] = [
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
  // TODO(burdon): Not a frame
  {
    module: {
      id: 'dxos.module.frame.bot',
      type: 'dxos:type/frame',
      displayName: 'Bots',
      description: 'Bot manager.'
    },
    runtime: {
      Icon: Robot,
      Component: BotFrame
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
      id: 'dxos.module.frame.bot',
      type: 'dxos:type/frame',
      displayName: 'Bots',
      description: 'Bot management.'
    },
    runtime: {
      Icon: Robot,
      Component: BotFrame
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
      Component: Document.Frame,
      List: Document.List
    }
  },
  {
    module: {
      id: 'dxos.module.frame.stack',
      type: 'dxos:type/frame',
      displayName: 'Stacks',
      description: 'Structured documents.'
    },
    runtime: {
      Icon: StackIcon,
      Component: Stack.Frame,
      List: Stack.List
    }
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
      description: 'Graphical User Interface and Data Explorer (GUIDE).'
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
      id: 'dxos.module.frame.sandbox',
      type: 'dxos:type/frame',
      displayName: 'Code Notebook',
      description: 'Collaborative script editor.'
    },
    runtime: {
      Icon: Code,
      Component: SandboxFrame
    }
  }
];

export const frameModules: Module[] = frameDefs.map(({ module }) => module);

// TODO(burdon): Make switchable based on dev/prod mode.
export const defaultFrameId = 'dxos.module.frame.kanban';

// prettier-ignore
export const defaultFrames = [
  'dxos.module.frame.stack',
  'dxos.module.frame.inbox',
  'dxos.module.frame.calendar',
  'dxos.module.frame.contact',
  'dxos.module.frame.kanban'
  // 'dxos.module.frame.bot'
  // 'dxos.module.frame.table',
  // 'dxos.module.frame.document',
  // 'dxos.module.frame.task',
  // 'dxos.module.frame.note',
  // 'dxos.module.frame.chess',
  // 'dxos.module.frame.file',
  // 'dxos.module.frame.explorer',
  // 'dxos.module.frame.note'
];

export type FrameMap = Map<string, FrameDef>;

// TODO(burdon): Active is unsound.
export const useFrames = (): { frames: FrameMap; active: string[] } => {
  const { modules } = useModules({ type: 'dxos:type/frame' });
  const { frames: active = [] } = useAppState()!;
  const frames = useMemo(
    () =>
      modules.reduce((map, module) => {
        const def = frameDefs.find((def) => def.module.id === module.id);
        assert(def);
        map.set(module.id!, def);
        return map;
      }, new Map<string, FrameDef>()),
    [modules]
  );

  return { frames, active };
};
