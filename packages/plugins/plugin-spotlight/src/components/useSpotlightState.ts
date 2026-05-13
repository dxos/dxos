//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { SpotlightCapabilities } from '#types';

export type UseSpotlightState = {
  state: SpotlightCapabilities.SpotlightState;
  updateState: (fn: (current: SpotlightCapabilities.SpotlightState) => SpotlightCapabilities.SpotlightState) => void;
};

export const useSpotlightState = (): UseSpotlightState => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(SpotlightCapabilities.State);
  const state = useAtomValue(stateAtom);

  const updateState = useCallback(
    (fn: (current: SpotlightCapabilities.SpotlightState) => SpotlightCapabilities.SpotlightState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  return { state, updateState };
};
