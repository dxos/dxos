//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';

import { PresenterOperation } from '#types';

/**
 * Exits presentation for the given object. Delegates to the toggle operation so the
 * fullscreen-revert and re-open run sequentially in a single handler — invoking them
 * separately races, leaving the deck stuck in fullscreen.
 */
export const useExitPresenter = (object: any) => {
  const { invokePromise } = useOperationInvoker();

  return useCallback(
    () => invokePromise(PresenterOperation.TogglePresentation, { object, state: false }),
    [invokePromise, object],
  );
};
