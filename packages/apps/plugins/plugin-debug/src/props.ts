//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import { SpaceProvides } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Debug as DebugType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export type DebugContextType = {
  running: boolean;
  start: (cb: () => void, period: number) => void;
  stop: () => void;
};

export const DebugContext: Context<DebugContextType> = createContext<DebugContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export type DebugPluginProvides = SpaceProvides & TranslationsProvides;

export interface DebugModel {
  object: DebugType;
}

export const isDebug = (datum: unknown): datum is DebugType => {
  return isTypedObject(datum) && DebugType.type.name === datum.__typename;
};
