//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import { dataResolvers } from './data-resolver';
import { sessionGraph } from './session-graph';
import { SessionContextValue } from './types';

export const defaultSessionContextValue = { sessionGraph, dataResolvers };

export const SessionContext: Context<SessionContextValue> =
  createContext<SessionContextValue>(defaultSessionContextValue);
