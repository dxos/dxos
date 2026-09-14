//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type Progress } from '@dxos/progress';

import { AppCapabilities } from '../../app-framework/index.ts';

// Stable fallbacks so the hooks degrade to "no progress" when the ProgressRegistry host is absent
// (e.g., a storybook, a test, or a minimal app config) rather than throwing.
const emptySnapshotAtom = Atom.make<Progress.ProgressSnapshot>({ updatedAt: '', tasks: [] });
const noMonitorAtom = Atom.make<Progress.TaskProgress | undefined>(undefined);

/** All active progress providers (aggregate). */
export const useProgressMonitors = (): readonly Progress.TaskProgress[] => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  return useAtomValue(registry?.snapshotAtom ?? emptySnapshotAtom).tasks;
};

/** One provider's live state, by name. */
export const useProgressMonitor = (name: string): Progress.TaskProgress | undefined => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  const atom = useMemo(() => registry?.monitorAtom(name) ?? noMonitorAtom, [registry, name]);
  return useAtomValue(atom);
};
