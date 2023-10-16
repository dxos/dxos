//
// Copyright 2023 DXOS.org
//

import { type AppState } from '@braneframe/types';

export const DND_PLUGIN = 'dxos.org/plugin/dnd';

export type DndStore = {
  appState?: AppState;
};

export type DndProvides = {
  dnd: {
    appState: () => AppState;
  };
};
