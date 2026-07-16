//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';

import { meta } from '#meta';

import { NamePopover } from '../../components';
import { useVersioning } from '../../hooks';
import {
  MAIN_BRANCH,
  branchLabel,
  commitToSelection,
  createBranch,
  createCheckpoint,
  createTimelineModel,
  discardBranch,
  mergeBranch,
} from '../../model';
import { type Markdown } from '../../types';

export type DocumentHistoryProps = AppSurface.ObjectArticleProps<Markdown.Document>;

/**
 * Companion panel: git-graph timeline of the document's checkpoints, branch forks, and merges.
 * Clicking a checkpoint time-travels the editor; clicking a branch fork switches the editor to it.
 */
export const DocumentHistory = forwardRef<HTMLElement, DocumentHistoryProps>(({ role, subject }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const versioning = useVersioning(subject);
  const { document, selection, setSelection, activeBranch } = versioning;
  const [naming, setNaming] = useState<'checkpoint' | 'branch' | undefined>(undefined);

  // Recomputed per render: the hook subscribes to history mutations and the model is
  // cheap at panel scale (a handful of records).
  const { commits, branches } = document
    ? createTimelineModel(document, { nowLabel: t('now.label') })
    : { commits: [], branches: [] };

  // Timeline for the Text the user is currently viewing (root or selected branch).
  const timelineTarget = activeBranch?.content.target ?? document?.content.target;

  const handleCreate = useCallback(
    (name: string) => {
      setNaming(undefined);
      if (!document) {
        return;
      }
      if (naming === 'checkpoint') {
        // Unnamed revisions are allowed; they display as their formatted creation time.
        createCheckpoint(document, { name: name.trim(), target: timelineTarget });
      } else if (naming === 'branch') {
        const branch = createBranch(document, {
          name: name.trim(),
          ...(timelineTarget ? { from: { target: timelineTarget } } : {}),
        });
        setSelection({ kind: 'branch', branchId: branch.id });
      }
    },
    [document, naming, timelineTarget, setSelection],
  );

  const handleSelect = useCallback(
    (commit: Commit | undefined) => {
      if (!document || !commit) {
        return;
      }
      const next = commitToSelection(document, commit);
      if (next) {
        setSelection(next);
      }
    },
    [document, setSelection],
  );

  const handleMerge = useCallback(() => {
    if (document && activeBranch) {
      mergeBranch(document, activeBranch);
      setSelection({ kind: 'current' });
    }
  }, [document, activeBranch, setSelection]);

  const handleDiscard = useCallback(() => {
    if (document && activeBranch) {
      discardBranch(document, activeBranch);
      setSelection({ kind: 'current' });
    }
  }, [document, activeBranch, setSelection]);

  if (!document) {
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
          currentBranch={selection.kind === 'branch' ? (activeBranch ? branchLabel(activeBranch) : null) : MAIN_BRANCH}
          onSelect={handleSelect}
        />
      </Panel.Content>
    </Panel.Root>
  );
});

DocumentHistory.displayName = 'DocumentHistory';
