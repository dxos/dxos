//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';
import { Branch, type History, Version } from '@dxos/versioning';

import { NamePopover } from '#components';
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

  // Recomputed per render: the component subscribes to history mutations and the model is
  // cheap at panel scale (a handful of records).
  const rootText = provider?.getTarget(subject);
  const { commits, branches } = provider
    ? createTimelineModel(object, rootText, { nowLabel: t('now.label') })
    : { commits: [], branches: [] };

  // Checkpoints/branches created from the panel target the legacy branch Text when one is
  // selected, otherwise the root. Core branches share the root's object — creation targets the
  // root (branch-state checkpoints and branch-of-branch arrive with the stage-3 convergence).
  const timelineTarget =
    (activeBranch && !Branch.isCore(activeBranch) ? activeBranch.content?.target : undefined) ?? rootText;

  const handleCreate = useCallback(
    (name: string) => {
      setNaming(undefined);
      if (!timelineTarget) {
        return;
      }
      if (naming === 'checkpoint') {
        // Unnamed revisions are allowed; they display as their formatted creation time.
        Version.create(object, { name: name.trim(), target: timelineTarget });
      } else if (naming === 'branch') {
        Branch.create(object, { name: name.trim(), parent: timelineTarget })
          .then((branch) => setSelection({ kind: 'branch', branchId: branch.id }))
          .catch((error) => log.catch(error));
      }
    },
    [object, naming, timelineTarget, setSelection],
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
            open={naming === 'checkpoint'}
            placeholder={t('revision-name.placeholder')}
            onSubmit={handleCreate}
            onCancel={() => setNaming(undefined)}
          >
            <IconButton
              icon='ph--bookmark-simple--regular'
              label={t('create-checkpoint.label')}
              onClick={() => setNaming('checkpoint')}
            />
          </NamePopover>
          <NamePopover
            open={naming === 'branch'}
            placeholder={t('branch-name.placeholder')}
            onSubmit={handleCreate}
            onCancel={() => setNaming(undefined)}
          >
            <IconButton
              icon='ph--git-branch--regular'
              label={t('create-branch.label')}
              onClick={() => setNaming('branch')}
            />
          </NamePopover>
          {activeBranch && (
            <>
              <IconButton icon='ph--git-merge--regular' iconOnly label={t('merge.label')} onClick={handleMerge} />
              <IconButton
                icon='ph--archive--regular'
                iconOnly
                label={t('discard-branch.label')}
                onClick={handleDiscard}
              />
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='overflow-y-auto'>
        <Timeline
          commits={commits}
          branches={branches}
          currentBranch={selection.kind === 'branch' ? (activeBranch ? Branch.label(activeBranch) : null) : MAIN_BRANCH}
          onSelect={handleSelect}
        />
      </Panel.Content>
    </Panel.Root>
  );
});

ObjectHistory.displayName = 'ObjectHistory';
