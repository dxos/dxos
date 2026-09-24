//
// Copyright 2026 DXOS.org
//

import { useEffect, useReducer } from 'react';

import { type ComputeGraphController } from '../graph/index.ts';

/** Re-renders the caller on every controller update, since the runtime state components read is not reactive. */
export const useControllerUpdates = (controller: ComputeGraphController): void => {
  const [, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => controller.update.on(() => bump()), [controller]);
};
