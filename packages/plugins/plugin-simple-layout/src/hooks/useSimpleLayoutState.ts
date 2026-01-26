//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/react';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../types';

export type SimpleLayoutStateHook = {
  state: SimpleLayoutState;
  updateState: (fn: (current: SimpleLayoutState) => SimpleLayoutState) => void;
};

export const useSimpleLayoutState = (): SimpleLayoutStateHook => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(SimpleLayoutStateCapability);
  const state = useAtomValue(stateAtom);

  const updateState = useCallback(
    (fn: (current: SimpleLayoutState) => SimpleLayoutState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  return { state, updateState };
};
