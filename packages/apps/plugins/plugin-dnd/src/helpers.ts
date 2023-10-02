//
// Copyright 2023 DXOS.org
//

import { AppState } from '@braneframe/types';

export const getAppStateIndex = (id: string, appState?: AppState): string | undefined => {
  return appState?.indices?.find(({ ref }) => ref === id)?.value;
};

export const setAppStateIndex = (id: string, value: string, appState?: AppState): string => {
  const entryIndex = appState?.indices?.findIndex(({ ref }) => ref === id);
  if (typeof entryIndex !== 'undefined' && entryIndex > -1) {
    appState!.indices = [
      ...appState!.indices.slice(0, entryIndex),
      { ref: id, value },
      ...appState!.indices.slice(entryIndex + 1, appState!.indices.length),
    ];
  } else if (appState) {
    appState.indices.push({ ref: id, value });
  }
  return value;
};
