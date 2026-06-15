//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { SimpleLayoutCapabilities } from '#types';

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
