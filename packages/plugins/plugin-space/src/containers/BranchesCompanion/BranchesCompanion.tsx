//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import {
  branchStateAtom,
  clearTimeTravel,
  createBranch,
  deleteBranch,
  getBranchActivity,
  mergeBranch,
  setTimeTravel,
  switchBranch,
} from '@dxos/echo-client';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { HistoryScrubber } from '@dxos/react-ui-components';

import { meta } from '#meta';

import { BranchList } from './BranchList';
import { createHistoryTimelineAtom } from './history-timeline';

export type BranchesCompanionProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

/**
 * Branches companion: a history scrubber plus the object's branch list. Builds a single timeline
 * from the primary object AND its referenced children (so a document's text is included) and drives
 * an in-place time-travel preview via `setTimeTravel`/`clearTimeTravel`. Branches are listed below
 * the scrubber, each row carrying its own switch / merge / delete control; the toolbar holds only
 * the create-branch action, which can fork from the live tip or from the scrubbed position.
 */
export const BranchesCompanion = ({ role, companionTo }: BranchesCompanionProps) => {
  const { t } = useTranslation(meta.id);

  // The subject identity is stable across scrubbing and branch switching (both happen in place).
  const objectRef = useRef(companionTo);
  const object = objectRef.current;

  const timelineAtom = useMemo(() => createHistoryTimelineAtom(object), [object]);
  const { versions, histories, plan } = useAtomValue(timelineAtom);

  // Reactive branch state: updates on any branch op, including create/delete (which mutate the space
  // root, not the object), so the list stays in sync without manual refresh.
  const { branches, current: currentBranch } = useAtomValue(branchStateAtom(object));

  // Ordering by most-recently-updated is snapshotted once at mount so rows do not reorder under the
  // user while they interact (or while a branch they are editing advances). Membership stays
  // reactive: branches created after mount surface first (they are the newest), deleted ones drop.
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getBranchActivity(object).then((activity) => {
      if (!cancelled) {
        setOrderedNames(Object.keys(activity).sort((a, b) => (activity[b] ?? 0) - (activity[a] ?? 0)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [object]);

  const displayBranches = useMemo(() => {
    const known = new Set(orderedNames);
    // Branches created after the snapshot are the newest; surface them on top, newest-first
    // (registry insertion order is oldest→newest, so reverse). Existing rows keep their snapshot
    // order below, so editing a branch never reshuffles the list.
    const fresh = branches.filter((name) => !known.has(name)).reverse();
    const kept = orderedNames.filter((name) => branches.includes(name));
    return [...fresh, ...kept];
  }, [orderedNames, branches]);

  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);
  const index = selectedIndex ?? Math.max(versions.length - 1, 0);
  const scrubbing = index < versions.length - 1;

  const latestPointers = useCallback(() => histories.map(({ diffs }) => diffs.length - 1), [histories]);

  // Per-member heads at the current scrub position, so "create branch from this point" forks the
  // WHOLE subtree (including a document's text child) at the scrubbed version, not just the root.
  const memberHeadsAtIndex = useCallback((): Record<string, string[]> => {
    const pointers = plan[index] ?? latestPointers();
    const result: Record<string, string[]> = {};
    histories.forEach(({ object: obj, diffs }, objectIndex) => {
      const at = Math.min(pointers[objectIndex] ?? diffs.length - 1, diffs.length - 1);
      const heads = diffs[at]?.heads;
      if (heads) {
        result[obj.id] = heads;
      }
    });
    return result;
  }, [histories, plan, index, latestPointers]);

  // Drive in-place time-travel from the current scrub position. The cleanup (on index change and on
  // unmount) always restores the live objects.
  useEffect(() => {
    const pointers = plan[index] ?? latestPointers();
    // Each object's latest MEANINGFUL version is its pointer at the final scrubber step. Trailing
    // no-op changes (e.g. the empty change appended when a doc rebinds on a branch switch) inflate
    // `diffs.length` without adding a step, so "at latest" must compare against the plan's final
    // pointers — comparing against the raw history length would read as not-latest and leave the
    // object needlessly pinned (read-only) after switching branches.
    const finalPointers = plan[plan.length - 1] ?? latestPointers();
    histories.forEach(({ object: obj, diffs }, objectIndex) => {
      const at = Math.min(pointers[objectIndex] ?? diffs.length - 1, diffs.length - 1);
      const atLatest = at >= (finalPointers[objectIndex] ?? diffs.length - 1);
      if (atLatest && !(scrubbing && obj === object)) {
        clearTimeTravel(obj);
      } else {
        setTimeTravel(obj, diffs[at].heads);
      }
    });
    return () => {
      for (const { object: obj } of histories) {
        clearTimeTravel(obj);
      }
    };
  }, [index, histories, plan, object, latestPointers, scrubbing]);

  const preview = useCallback((eventIndex: number) => setSelectedIndex(eventIndex), []);

  const handleSwitch = useCallback(
    async (name: string) => {
      setSelectedIndex(undefined); // Exit scrub mode; switching is a harder navigation.
      await switchBranch(object, name);
    },
    [object],
  );

  const handleCreate = useCallback(async () => {
    // A unique, human-readable branch name.
    const existing = new Set(branches);
    let suffix = existing.size;
    let name = `branch-${suffix}`;
    while (existing.has(name)) {
      name = `branch-${++suffix}`;
    }
    const fromHeads = scrubbing ? memberHeadsAtIndex() : undefined;
    // Exit scrub mode and drop pins before mutating branches.
    for (const { object: obj } of histories) {
      clearTimeTravel(obj);
    }
    setSelectedIndex(undefined);
    await createBranch(object, name, fromHeads ? { fromHeads } : undefined);
    await switchBranch(object, name);
  }, [object, branches, histories, scrubbing, memberHeadsAtIndex]);

  const handleMerge = useCallback((name: string) => void mergeBranch(object, name), [object]);

  const handleDelete = useCallback((name: string) => deleteBranch(object, name), [object]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--git-branch--regular'
            label={t('branch-create.label')}
            onClick={() => void handleCreate()}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div className='p-2'>
          <HistoryScrubber versions={versions} value={index} onValueChange={preview} />
        </div>
        <div className='border-bs border-separator p-2'>
          <h2 className='mbe-1 text-xs text-description'>{t('branches.label')}</h2>
          <BranchList
            branches={displayBranches}
            current={currentBranch}
            onSwitch={(name) => void handleSwitch(name)}
            onMerge={handleMerge}
            onDelete={handleDelete}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
