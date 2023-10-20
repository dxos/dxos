//
// Copyright 2023 DXOS.org
//

import { createContext, useContext } from 'react';

import { type DispatchIntent } from './intent';

export type IntentContext = {
  dispatch: DispatchIntent;
};

const IntentContext = createContext<IntentContext>({ dispatch: async () => {} });

export const useIntent = () => useContext(IntentContext);

export const IntentProvider = IntentContext.Provider;
