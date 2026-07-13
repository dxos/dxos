//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type Progress } from '@dxos/progress';

import { AppCapabilities } from '../../app-framework';

// Stable fallbacks so the hooks degrade to "no progress" when the ProgressRegistry host is absent
// (e.g. a storybook, a test, or a minimal app config) rather than throwing.
const emptySnapshotAtom = Atom.make<Progress.ProgressSnapshot>({ updatedAt: '', tasks: [] });
const noMonitorAtom = Atom.make<Progress.TaskProgress | undefined>(undefined);

/** All active progress providers (aggregate) — for the R0 rail popover / status UIs. */
export const useProgressMonitors = (): readonly Progress.TaskProgress[] => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  return useAtomValue(registry?.snapshotAtom ?? emptySnapshotAtom).tasks;
};

/** One provider's live state, by name — for an inline meter. */
export const useProgress = (name: string): Progress.TaskProgress | undefined => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  const atom = useMemo(() => registry?.monitorAtom(name) ?? noMonitorAtom, [registry, name]);
  return useAtomValue(atom);
};
