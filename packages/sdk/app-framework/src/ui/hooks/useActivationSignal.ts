//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { EffectEx } from '@dxos/effect';

import { type ActivationEvent } from '../../core/index.ts';
import { useOptionalPluginManager } from '../components/index.ts';

/**
 * Fires an activation event on mount — the UI-side half of demand-driven activation. A container
 * that constitutes the demand signal for policy-parked modules (a create-object picker, an
 * assistant chat) calls this so the parked providers load exactly when the surface first appears;
 * re-fires of an already-dispatched event are cheap no-ops.
 */
export const useActivationSignal = (event: ActivationEvent.ActivationEvent): void => {
  const manager = useOptionalPluginManager();
  useEffect(() => {
    if (!manager) {
      return;
    }
    EffectEx.runDetached(manager.activate(event));
  }, [manager, event]);
};
