//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/react';

import { SimpleLayoutState } from '../types';

export type UseSimpleLayoutState = {
  state: SimpleLayoutState;
  updateState: (fn: (current: SimpleLayoutState) => SimpleLayoutState) => void;
};

export const useSimpleLayoutState = (): UseSimpleLayoutState => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(SimpleLayoutState);
  const state = useAtomValue(stateAtom);

  const updateState = useCallback(
    (fn: (current: SimpleLayoutState) => SimpleLayoutState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  return { state, updateState };
};
