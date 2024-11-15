//
// Copyright 2024 DXOS.org
//

import { useSyncExternalStore } from 'react';

const getSnapshot = () => navigator.onLine;

const getServerSnapshot = () => true;

const subscribe = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

export const useIsOnline = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
