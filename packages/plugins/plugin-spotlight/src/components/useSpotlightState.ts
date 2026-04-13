//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { type SpotlightState, SpotlightState as SpotlightStateCapability } from '#types';

export type UseSpotlightState = {
  state: SpotlightState;
  updateState: (fn: (current: SpotlightState) => SpotlightState) => void;
};

export const useSpotlightState = (): UseSpotlightState => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(SpotlightStateCapability);
  const state = useAtomValue(stateAtom);

  const updateState = useCallback(
    (fn: (current: SpotlightState) => SpotlightState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  return { state, updateState };
};
