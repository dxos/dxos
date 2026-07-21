//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { NamePopover, useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';
import { Branch, type History, Version } from '@dxos/versioning';

import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

import { MAIN_BRANCH, commitToSelection, createTimelineModel } from '../../model';

export type ObjectHistoryProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Companion panel: git-graph timeline of an object's checkpoints, branch forks, and merges.
 * Clicking a checkpoint time-travels the object's surfaces; clicking a branch fork switches to it.
 * Gated per-type by a `SpaceCapabilities.HistoryProvider` contribution.
 */
export const ObjectHistory = forwardRef<HTMLElement, ObjectHistoryProps>(({ role, subject }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const providers = useCapabilities(SpaceCapabilities.HistoryProvider);
  const provider = providers.find(({ id }) => id === Obj.getTypename(subject));
  const object: History.VersionedObject = subject;
  const [naming, setNaming] = useState<'checkpoint' | 'branch' | undefined>(undefined);

  // Subscribe to history mutations (checkpoints/branches added elsewhere).
  useObject(object, 'history');

  // Selection is session-local: collaborators each view their own version.
  const [state, setState] = useAtomCapabilityState(SpaceCapabilities.VersioningState);
  const objectId = object.id;
  const selection = state.selection[objectId] || { kind: 'current' as const };
  const setSelection = useCallback(
    (next: SpaceCapabilities.VersionSelection) => {
      setState((current) => ({ ...current, selection: { ...current.selection, [objectId]: next } }));
    },
    [objectId, setState],
  );

  // The branch being viewed (selection.kind === 'branch').
  const activeBranch =
    selection.kind === 'branch'
      ? object.history?.branches.find((branch) => branch.id === selection.branchId && branch.status === 'active')
      : undefined;
  // The checkpoint being viewed (selection.kind === 'checkpoint'). A new branch created while
  // viewing a checkpoint forks from THAT revision, not the live tip.
  const activeVersion =
    selection.kind === 'checkpoint'
      ? object.history?.versions.find((version) => version.id === selection.versionId)
      : undefined;

  // The lane the current selection sits on. The timeline highlights this branch; it must match the
  // SELECTED commit's lane, or the timeline would snap the highlight to the lane's first commit
  // (e.g. selecting a branch revision would jump to the main-lane fork checkpoint). A branch
  // checkpoint lanes on its branch; base checkpoints and `current` lane on main.
  const currentBranch: string | null =
    selection.kind === 'branch'
      ? activeBranch
        ? Branch.label(activeBranch)
        : null
      : selection.kind === 'fork'
        ? (() => {
            // The fork node lanes on its branch; highlight that lane so the selection is not snapped
            // onto main's first commit (see the `currentBranch` jump effect in Timeline).
            const branch = object.history?.branches.find(
              (branch) => branch.id === selection.branchId && branch.status !== 'archived',
            );
            return branch ? Branch.label(branch) : MAIN_BRANCH;
          })()
        : activeVersion?.branch
          ? (() => {
              const branch = object.history?.branches.find(
                (branch) => branch.key === activeVersion.branch && branch.status !== 'archived',
              );
              return branch ? Branch.label(branch) : MAIN_BRANCH;
            })()
          : MAIN_BRANCH;

  // Recomputed per render: the component subscribes to history mutations and the model is
  // cheap at panel scale (a handful of records).
  const rootText = provider?.getTarget(subject);
  const { commits, branches } = provider
    ? createTimelineModel(object, rootText, { nowLabel: t('now.label'), branchTipLabel: t('branch-tip.label') })
    : { commits: [], branches: [] };

  // Branch/checkpoint creation targets the active branch when one is selected, else the root.
  // For a legacy content-copy branch the target is its own Text; a core branch shares the root's
  // object, so we bind to it (below) to read the branch's heads.
  const legacyBranchText = activeBranch && !Branch.isCore(activeBranch) ? activeBranch.content?.target : undefined;
  const timelineTarget = legacyBranchText ?? rootText;

  const handleCreate = useCallback(
    (name: string) => {
      setNaming(undefined);
      if (!timelineTarget) {
        return;
      }
      if (naming === 'checkpoint') {
        // A checkpoint on a core branch must record the BRANCH's heads (and be tagged with the
        // branch), so bind to it and checkpoint the branch-bound Text; otherwise the revision would
        // record the parent's heads and land on the main lane. Unnamed revisions are allowed.
        if (activeBranch && Branch.isCore(activeBranch)) {
          Branch.bind(object, activeBranch)
            .then((binding) => {
              try {
                Version.create(object, { name: name.trim(), target: binding.object, branch: activeBranch.key });
              } finally {
                binding.dispose();
              }
            })
            .catch((error) => log.catch(error));
        } else {
          Version.create(object, { name: name.trim(), target: timelineTarget });
        }
      } else if (naming === 'branch') {
        // Fork from the viewed checkpoint's revision when one is selected (a base checkpoint's heads
        // live in the root doc); otherwise from the live tip. Branch-of-branch (a checkpoint tagged
        // with a branch) is not yet supported here, so it falls back to the tip.
        const forkFrom = activeVersion && !activeVersion.branch ? activeVersion : undefined;
        const parent = forkFrom?.target.target ?? timelineTarget;
        Branch.create(object, {
          name: name.trim(),
          parent,
          ...(forkFrom ? { heads: forkFrom.heads } : {}),
        })
          .then((branch) => setSelection({ kind: 'branch', branchId: branch.id }))
          .catch((error) => log.catch(error));
      }
    },
    [object, naming, activeBranch, activeVersion, timelineTarget, setSelection],
  );

  const handleSelect = useCallback(
    (commit: Commit | undefined) => {
      if (!commit) {
        return;
      }
      const next = commitToSelection(object, commit);
      if (next) {
        setSelection(next);
      }
    },
    [object, setSelection],
  );

  const handleMerge = useCallback(() => {
    if (activeBranch) {
      Branch.merge(object, activeBranch)
        .then(() => setSelection({ kind: 'current' }))
        .catch((error) => log.catch(error));
    }
  }, [object, activeBranch, setSelection]);

  const handleDiscard = useCallback(() => {
    if (activeBranch) {
      Branch.discard(object, activeBranch);
      setSelection({ kind: 'current' });
    }
  }, [object, activeBranch, setSelection]);

  if (!provider) {
    return null;
  }

  return (
    // Surface passes Ref<HTMLElement> and Panel.Root renders a div, so narrowing is safe.
    <Panel.Root role={role} ref={forwardedRef as React.Ref<HTMLDivElement>}>
      <Panel.Toolbar>
        <Toolbar.Root classNames='dx-document'>
          <NamePopover
            placeholder={t('revision-name.placeholder')}
            submitLabel={t('create.label')}
            open={naming === 'checkpoint'}
            onSubmit={handleCreate}
            onCancel={() => setNaming(undefined)}
          >
            <IconButton
              icon='ph--bookmark-simple--regular'
              label={t('create-checkpoint.label')}
              // A revision records the tip; disable while viewing a historical checkpoint or a fork
              // point (neither is at a tip). `current` and `branch` selections are at a tip.
              disabled={selection.kind === 'checkpoint' || selection.kind === 'fork'}
              onClick={() => setNaming('checkpoint')}
            />
          </NamePopover>
          <NamePopover
            placeholder={t('branch-name.placeholder')}
            submitLabel={t('create.label')}
            open={naming === 'branch'}
            onSubmit={handleCreate}
            onCancel={() => setNaming(undefined)}
          >
            <IconButton
              icon='ph--git-branch--regular'
              label={t('create-branch.label')}
              // Forking a sub-branch off a branch (its tip or one of its revisions) is not yet
              // supported — the core registry is flat, keyed by the root object, so the fork would
              // silently derive from main. Disable rather than mislead. Fork from main or a main
              // revision is allowed. See DESIGN.md (nested branch-of-branch follow-up). A fork-point
              // view is read-only and off-tip, so disable there too.
              disabled={!!activeBranch || !!activeVersion?.branch || selection.kind === 'fork'}
              onClick={() => setNaming('branch')}
            />
          </NamePopover>
          {activeBranch && (
            <>
              <IconButton icon='ph--git-merge--regular' label={t('merge.label')} onClick={handleMerge} />
              <IconButton icon='ph--trash--regular' label={t('discard-branch.label')} onClick={handleDiscard} />
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='overflow-y-auto'>
        <Timeline commits={commits} branches={branches} currentBranch={currentBranch} onSelect={handleSelect} />
      </Panel.Content>
    </Panel.Root>
  );
});

ObjectHistory.displayName = 'ObjectHistory';
