//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, IconButton, Input, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';

import { meta } from '#meta';

import { useVersioning } from '../../hooks';
import {
  MAIN_BRANCH,
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
export const DocumentHistory = forwardRef<HTMLDivElement, DocumentHistoryProps>(({ role, subject }, forwardedRef) => {
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
      if (!document || !name.trim()) {
        setNaming(undefined);
        return;
      }
      if (naming === 'checkpoint') {
        createCheckpoint(document, { name: name.trim(), target: timelineTarget });
      } else if (naming === 'branch') {
        const branch = createBranch(document, {
          name: name.trim(),
          ...(timelineTarget ? { from: { target: timelineTarget } } : {}),
        });
        setSelection({ kind: 'branch', branchId: branch.id });
      }
      setNaming(undefined);
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
    <Panel.Root role={role} ref={forwardedRef}>
      <Panel.Toolbar>
        <Toolbar.Root classNames='dx-document'>
          <IconButton
            icon='ph--bookmark-simple--regular'
            label={t('create-checkpoint.label')}
            onClick={() => setNaming('checkpoint')}
          />
          <IconButton
            icon='ph--git-branch--regular'
            label={t('create-branch.label')}
            onClick={() => setNaming('branch')}
          />
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
        {naming && (
          <NameInput
            placeholder={t(naming === 'checkpoint' ? 'version-name.placeholder' : 'branch-name.placeholder')}
            onSubmit={handleCreate}
            onCancel={() => setNaming(undefined)}
          />
        )}
        <Timeline
          commits={commits}
          branches={branches}
          currentBranch={selection.kind === 'branch' ? (activeBranch?.name ?? null) : MAIN_BRANCH}
          onSelect={handleSelect}
        />
      </Panel.Content>
    </Panel.Root>
  );
});

DocumentHistory.displayName = 'DocumentHistory';

type NameInputProps = {
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

const NameInput = ({ placeholder, onSubmit, onCancel }: NameInputProps) => {
  const [value, setValue] = useState('');
  const { t } = useTranslation(meta.profile.key);

  return (
    <div role='none' className='flex items-center gap-1 pli-2 plb-1'>
      <Input.Root>
        <Input.TextInput
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSubmit(value);
            } else if (event.key === 'Escape') {
              onCancel();
            }
          }}
        />
      </Input.Root>
      <Button variant='primary' onClick={() => onSubmit(value)}>
        {t('create.label')}
      </Button>
    </div>
  );
};
