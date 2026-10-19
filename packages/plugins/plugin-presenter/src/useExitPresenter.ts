//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import { PresenterOperation } from '#types';

/**
 * Exits presentation for the given object. Delegates to the toggle operation so the
 * fullscreen-revert and re-open run sequentially in a single handler — invoking them
 * separately races, leaving the deck stuck in fullscreen.
 */
export const useExitPresenter = (object: any) => {
  const { invokePromise } = Hooks.useOperationInvoker();

  return useCallback(
    () => invokePromise(PresenterOperation.SetPresenting, { object, state: false }),
    [invokePromise, object],
  );
};
