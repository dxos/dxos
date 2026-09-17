//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import { usePluginManager } from '@dxos/app-framework/ui';

export const useActivationEventFired = (event: ActivationEvent.ActivationEvent): boolean => {
  const manager = usePluginManager();
  const key = ActivationEvent.eventKey(event);
  const firedAtom = useMemo(() => Atom.make((get) => get(manager.eventsFired).includes(key)), [manager, key]);
  return useAtomValue(firedAtom);
};
