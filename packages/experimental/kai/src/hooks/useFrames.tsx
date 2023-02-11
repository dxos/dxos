//
// Copyright 2022 DXOS.org
//

import React, { Context, Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';

import { Module } from '@dxos/protocols/proto/dxos/config';

// TODO(burdon): Remove enum (registry).
export enum FrameID {
  STACK = 'dxos.module.frame.stack',
  TABLE = 'dxos.module.frame.table',
  KANBAN = 'dxos.module.frame.kanban',
  TASK = 'dxos.module.frame.task',
  CALENDAR = 'dxos.module.frame.events',
  DOCUMENT = 'dxos.module.frame.document',
  NOTE = 'dxos.module.frame.note',
  FILE = 'dxos.module.frame.file',
  SKETCH = 'dxos.module.frame.sketch',
  EXPLORER = 'dxos.module.frame.explorer',
  MAPS = 'dxos.module.frame.maps',
  PRESENTER = 'dxos.module.frame.presenter', // TODO(burdon): MDX.
  CHESS = 'dxos.module.frame.chess',
  SANDBOX = 'dxos.module.frame.sandbox'
}

export const defaultFrameId = FrameID.STACK;

// prettier-ignore
// TODO(burdon): From space.
const activeFrames = [
  FrameID.STACK,
  FrameID.TABLE,
  FrameID.TASK,
  FrameID.KANBAN
  // FrameID.EXPLORER
  // FrameID.NOTES
];

export type FrameDef = {
  module: Module;
  runtime: {
    Icon: FC<any>;
    Component: FC<any>;
    Tile?: FC<any>;
  };
};

export type FrameMap = Map<string, FrameDef>;

export type FramesContextType = {
  frames: FrameMap;
  active: string[];
};

const createFrameMap = (frames: FrameDef[]): FrameMap =>
  frames.reduce((map: FrameMap, frame) => {
    map.set(frame.module.id!, frame);
    return map;
  }, new Map<string, FrameDef>());

export type FramesStateContextType = [FramesContextType, Dispatch<SetStateAction<FramesContextType>>];

export const FramesContext: Context<FramesStateContextType | undefined> = createContext<
  FramesStateContextType | undefined
>(undefined);

export const FramesProvider: FC<{ children: ReactNode; frames: FrameDef[] }> = ({ children, frames }) => {
  // TODO(burdon): useDMG.
  const [state, setState] = useState<FramesContextType>({ frames: createFrameMap(frames), active: activeFrames });
  return <FramesContext.Provider value={[state, setState]}>{children}</FramesContext.Provider>;
};

// TODO(burdon): DMG.
export const useFrames = (): { frames: FrameMap; active: string[] } => {
  const [{ frames, active }] = useContext(FramesContext)!;
  return { frames, active };
};

export const useFrameDispatch = () => {
  const [, dispatch] = useContext(FramesContext)!;
  return (id: string, add: boolean) => {
    dispatch((context: FramesContextType) => {
      const { frames, active } = context;
      const list = active.filter((frame) => frame !== id);
      if (add) {
        list.push(id);
      }

      return {
        frames,
        active: list
      };
    });
  };
};
