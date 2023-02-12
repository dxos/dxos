//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
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
import { FC, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useSpaces } from '@dxos/react-client';
import { useModules } from '@dxos/react-metagraph';

import {
  CalendarFrame,
  ChessFrame,
  StackFrame,
  Document,
  ExplorerFrame,
  File,
  KanbanFrame,
  MapFrame,
  NoteFrame,
  SketchFrame,
  TableFrame,
  TaskFrame,
  SandboxFrame
} from '../frames';
import { useAppState } from './useAppState';

export type FrameDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    Component: FC<any>;
    Tile?: FC<any>;
  };
};

/**
 * Combination of Metagraph module proto defs and runtime component defs (which would be dynamically loaded).
 */
// prettier-ignore
const defs: FrameDef[] = [
  {
    module: {
      id: 'dxos.module.frame.stack',
      type: 'dxos:type/frame',
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
      description: 'Card based process management.'
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
      description: 'Project and task management tools.'
    },
    runtime: {
      Icon: ListChecks,
      Component: TaskFrame
    }
  },
  {
    module: {
      id: 'dxos.module.frame.calendar',
      type: 'dxos:type/frame',
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
      id: 'dxos.module.frame.document',
      type: 'dxos:type/frame',
      displayName: 'Documents',
      description: 'Realtime structured document editing.'
    },
    runtime: {
      Icon: Article,
      Component: Document.Frame,
      Tile: Document.Tile
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
      Component: NoteFrame
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
      Tile: File.Tile
    }
  },
  {
    module: {
      id: 'dxos.module.frame.sketch',
      type: 'dxos:type/frame',
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
      displayName: 'Sandbox',
      description: 'Collaborative code sandbox.'
    },
    runtime: {
      Icon: Code,
      Component: SandboxFrame
    }
  }
];

export const frameModules: Module[] = defs.map(({ module }) => module);

export const defaultFrameId = 'dxos.module.frame.chess';

// prettier-ignore
export const defaultFrames = [
  'dxos.module.frame.stack',
  'dxos.module.frame.table',
  'dxos.module.frame.task',
  'dxos.module.frame.document',
  'dxos.module.frame.chess'
  // 'dxos.module.frame.file'
  // 'dxos.module.frame.kanban'
  // 'dxos.module.frame.explorer'
  // 'dxos.module.frame.notes'
];

export type FrameMap = Map<string, FrameDef>;

// TODO(burdon): Active is unsound.
export const useFrames = (): { frames: FrameMap; active: string[] } => {
  const { modules } = useModules({ type: 'dxos:type/frame' });
  const { frames: active = [] } = useAppState()!;
  const frames = useMemo(
    () =>
      modules.reduce((map, module) => {
        const def = defs.find((def) => def.module.id === module.id);
        assert(def);
        map.set(module.id!, def);
        return map;
      }, new Map<string, FrameDef>()),
    [modules]
  );

  return { frames, active };
};

export type FrameState = {
  space?: Space;
  frame?: FrameDef;
  objectId?: string;
};

// TODO(burdon): Combine frame hooks?
// TODO(burdon): Better abstraction for app state hierarchy?
export const useFrameState = (): FrameState => {
  const { spaceKey, frame, objectId } = useParams();

  const spaces = useSpaces();
  const space = spaces.find((space) => space.key.truncate() === spaceKey);

  // TODO(burdon): Active is unsound.
  const { frames, active: activeFrames } = useFrames();
  const frameDef = frame && activeFrames.find((frameId) => frameId === frame) ? frames.get(frame) : undefined;

  return { space, frame: frameDef, objectId };
};
