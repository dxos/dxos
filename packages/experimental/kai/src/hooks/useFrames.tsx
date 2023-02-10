//
// Copyright 2022 DXOS.org
//

import React, { Context, createContext, Dispatch, FC, ReactNode, SetStateAction, useContext, useState } from 'react';

export enum FrameID {
  SETTINGS = 'settings',
  REGISTRY = 'registry',
  STACK = 'stack',
  TABLE = 'table',
  KANBAN = 'kanban',
  TASK = 'task',
  CALENDAR = 'events',
  DOCUMENT = 'document',
  NOTE = 'note',
  FILE = 'file',
  SKETCH = 'sketch',
  EXPLORER = 'explorer',
  MAPS = 'maps',
  PRESENTER = 'presenter', // TODO(burdon): MDX.
  CHESS = 'chess',
  SANDBOX = 'sandbox'
}

export const defaultFrameId = FrameID.KANBAN;

// prettier-ignore
const activeFrames = [
  FrameID.SETTINGS,
  FrameID.REGISTRY,
  FrameID.STACK,
  FrameID.TABLE,
  FrameID.TASK,
  FrameID.KANBAN
  // FrameID.EXPLORER
  // FrameID.NOTES
];

// TODO(burdon): Compact view (e.g., within Space).
export type FrameDef = {
  id: FrameID;
  system?: boolean;
  title: string;
  description?: string;
  Icon: FC<any>;
  Component: FC<any>;
  Compact?: FC<any>;
};

export type FrameMap = { [index: string]: FrameDef };

export type FramesContextType = {
  frames: FrameMap;
  active: FrameID[];
};

const createFrameMap = (frames: FrameDef[]): FrameMap =>
  frames.reduce((map: FrameMap, frame) => {
    map[frame.id] = frame;
    return map;
  }, {});

export type FramesStateContextType = [FramesContextType, Dispatch<SetStateAction<FramesContextType>>];

export const FramesContext: Context<FramesStateContextType | undefined> = createContext<
  FramesStateContextType | undefined
>(undefined);

export const FramesProvider: FC<{ children: ReactNode; frames: FrameDef[] }> = ({ children, frames }) => {
  // TODO(burdon): useDMG.
  const [state, setState] = useState<FramesContextType>({ frames: createFrameMap(frames), active: activeFrames });
  return <FramesContext.Provider value={[state, setState]}>{children}</FramesContext.Provider>;
};

export const useFrames = (): FrameMap => {
  const [{ frames }] = useContext(FramesContext)!;
  return frames;
};

export const useActiveFrames = (): FrameDef[] => {
  const [{ active, frames }] = useContext(FramesContext)!;
  return active.map((id) => frames[id]);
};

export const useFrameDispatch = () => {
  const [, dispatch] = useContext(FramesContext)!;
  return (id: FrameID, add: boolean) => {
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
