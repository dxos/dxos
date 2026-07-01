//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Engine } from '@dxos/graph-engine';

const EngineContext = createContext<Engine | undefined>(undefined);

export const EngineContextProvider = EngineContext.Provider;

export const useEngineContext = (): Engine => useContext(EngineContext) ?? raise(new Error('Missing <GraphRoot>'));
