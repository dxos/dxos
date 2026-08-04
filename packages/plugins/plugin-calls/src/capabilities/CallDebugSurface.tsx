//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { CallDebugPanel } from '#containers';
import { CallsCapabilities } from '#types';

/** Reads live call state from the manager capability, which the surface's `props` mapper cannot do. */
export const CallDebugSurface = () => {
  const call = useCapability(CallsCapabilities.Manager);
  const state = useAtomValue(call.stateAtom);

  return <CallDebugPanel state={state} />;
};
