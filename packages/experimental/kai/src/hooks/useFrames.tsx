//
// Copyright 2022 DXOS.org
//

import React, { Context, createContext, Dispatch, FC, ReactNode, SetStateAction, useContext, useState } from 'react';

export enum FrameID {
  DMG = 'registry',
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
  TABLE = 'tables',
  KANBAN = 'kanban',
  TASKS = 'tasks',
  CALENDAR = 'events',
  DOCUMENTS = 'documents',
  EXPLORER = 'explorer',
  MAPS = 'maps',
  CHESS = 'chess'
}

const activeFrames = [FrameID.DMG, FrameID.DASHBOARD, FrameID.TABLE, FrameID.TASKS];

// TODO(burdon): Change type to id.
export type FrameDef = { id: FrameID; system?: boolean; title: string; Icon: FC<any>; Component: FC<any> };

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
  return (id: FrameID, state: boolean) => {
    dispatch((context: FramesContextType) => {
      const { frames, active } = context;
      if (active.findIndex((active) => active === id) !== -1) {
        return context;
      }

      return {
        frames,
        active: [...active, id]
      };
    });
  };
};
