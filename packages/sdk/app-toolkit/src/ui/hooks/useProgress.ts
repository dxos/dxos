//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Progress } from '@dxos/progress';

import { AppCapabilities } from '../../app-framework';

/** All active progress providers (aggregate) — for the R0 rail popover / status UIs. */
export const useProgressMonitors = (): readonly Progress.TaskProgress[] => {
  const registry = useCapability(AppCapabilities.ProgressRegistry);
  return useAtomValue(registry.snapshotAtom).tasks;
};

/** One provider's live state, by name — for an inline meter. */
export const useProgress = (name: string): Progress.TaskProgress | undefined => {
  const registry = useCapability(AppCapabilities.ProgressRegistry);
  const atom = useMemo(() => registry.monitorAtom(name), [registry, name]);
  return useAtomValue(atom);
};
