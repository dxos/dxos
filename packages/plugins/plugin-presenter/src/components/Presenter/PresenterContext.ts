//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

export type PresenterContextType = {
  running: boolean;
  start: () => void;
  stop: () => void;
};

// Lives with the components rather than under `types/`: `createContext` is a real React import, and
// `types/` is reachable from the node-conditioned capability barrel, so a context declared there
// pulls React into a headless bundle.
export const PresenterContext: Context<PresenterContextType> = createContext<PresenterContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});
