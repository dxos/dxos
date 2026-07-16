//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, forwardRef, useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, IconButton, Input, Panel, Popover, Toolbar, useTranslation } from '@dxos/react-ui';
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
        // Branch names label timeline lanes, so an empty name falls back to the creation time.
        const branch = createBranch(document, {
          name: name.trim() || new Date().toLocaleString(),
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
          currentBranch={selection.kind === 'branch' ? (activeBranch?.name ?? null) : MAIN_BRANCH}
          onSelect={handleSelect}
        />
      </Panel.Content>
    </Panel.Root>
  );
});

DocumentHistory.displayName = 'DocumentHistory';

type NameInputProps = {
  open: boolean;
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

/**
 * Name-entry popover anchored to its trigger (mirrors the object rename popover UX).
 * Enter or Create commits — an empty name is allowed; Escape or dismissal cancels.
 */
const NamePopover = ({ children, open, placeholder, onSubmit, onCancel }: PropsWithChildren<NameInputProps>) => {
  const [value, setValue] = useState('');
  const { t } = useTranslation(meta.profile.key);

  const submit = () => {
    onSubmit(value);
    setValue('');
  };

  const cancel = () => {
    onCancel();
    setValue('');
  };

  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && cancel()}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <div role='none' className='flex items-center gap-1 p-2'>
            <Input.Root>
              <Input.Label srOnly>{placeholder}</Input.Label>
              <Input.TextInput
                autoFocus
                placeholder={placeholder}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    submit();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                  }
                }}
              />
            </Input.Root>
            <Button variant='primary' onClick={submit}>
              {t('create.label')}
            </Button>
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
