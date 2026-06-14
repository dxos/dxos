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
  mergeBranch,
  setTimeTravel,
  switchBranch,
} from '@dxos/echo-client';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { HistoryScrubber } from '@dxos/react-ui-components';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { createHistoryTimelineAtom } from './history-timeline';

export type HistoryCompanionProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

/**
 * History scrubber + branch companion. Builds a single timeline from the primary object AND its
 * referenced children (so a document's text is included) and drives an in-place time-travel preview
 * via `setTimeTravel`/`clearTimeTravel`. Branch controls (switch / create / merge / delete) drive the
 * core branching API; creating a branch can fork from the live tip or from the scrubbed position.
 */
export const HistoryCompanion = ({ role, companionTo }: HistoryCompanionProps) => {
  const { t } = useTranslation(meta.id);

  // The subject identity is stable across scrubbing and branch switching (both happen in place).
  const objectRef = useRef(companionTo);
  const object = objectRef.current;

  const timelineAtom = useMemo(() => createHistoryTimelineAtom(object), [object]);
  const { versions, histories, plan } = useAtomValue(timelineAtom);

  // Reactive branch state: updates on any branch op, including create/delete (which mutate the space
  // root, not the object), so the picker stays in sync without manual refresh.
  const { branches, current: currentBranch } = useAtomValue(branchStateAtom(object));

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
    histories.forEach(({ object: obj, diffs }, objectIndex) => {
      const at = Math.min(pointers[objectIndex] ?? diffs.length - 1, diffs.length - 1);
      if (at >= diffs.length - 1 && !(scrubbing && obj === object)) {
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
  }, [index, versions.length, histories, plan, object, latestPointers, scrubbing]);

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

  const handleMerge = useCallback(async () => {
    if (currentBranch === 'main') {
      return;
    }
    await mergeBranch(object, currentBranch);
  }, [object, currentBranch]);

  const handleDelete = useCallback(async () => {
    if (currentBranch === 'main') {
      return;
    }
    deleteBranch(object, currentBranch);
    await switchBranch(object, 'main');
  }, [object, currentBranch]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {branches.map((name) => (
            <Button
              key={name}
              variant={name === currentBranch ? 'primary' : 'default'}
              onClick={() => void handleSwitch(name)}
            >
              {name}
            </Button>
          ))}
          <div role='none' className='grow' />
          <Toolbar.IconButton
            icon='ph--git-branch--regular'
            label={t('branch-create.label')}
            onClick={() => void handleCreate()}
          />
          <Toolbar.IconButton
            icon='ph--git-merge--regular'
            label={t('branch-merge.label')}
            disabled={currentBranch === 'main'}
            onClick={() => void handleMerge()}
          />
          <Toolbar.IconButton
            icon='ph--trash--regular'
            label={t('branch-delete.label')}
            disabled={currentBranch === 'main'}
            onClick={() => void handleDelete()}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div className={mx('p-2')}>
          <HistoryScrubber versions={versions} value={index} onValueChange={preview} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
