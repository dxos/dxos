//
// Copyright 2024 DXOS.org
//

import React, { useSyncExternalStore } from 'react'

export const useIsServer = () =>
  useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );
