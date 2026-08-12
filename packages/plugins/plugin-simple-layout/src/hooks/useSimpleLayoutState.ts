//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import * as SimpleLayoutCapabilities from '../types/SimpleLayoutCapabilities';

export type UseSimpleLayoutState = {
  state: SimpleLayoutCapabilities.SimpleLayoutState;
  updateState: (
    fn: (current: SimpleLayoutCapabilities.SimpleLayoutState) => SimpleLayoutCapabilities.SimpleLayoutState,
  ) => void;
};

export const useSimpleLayoutState = (): UseSimpleLayoutState => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(SimpleLayoutCapabilities.State);
  const state = useAtomValue(stateAtom);

  const updateState = useCallback(
    (fn: (current: SimpleLayoutCapabilities.SimpleLayoutState) => SimpleLayoutCapabilities.SimpleLayoutState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  return { state, updateState };
};
