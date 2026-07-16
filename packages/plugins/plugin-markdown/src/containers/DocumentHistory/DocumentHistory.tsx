//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, Icon, IconButton, Input, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useVersioning } from '../../hooks';
import {
  contentAt,
  createBranch,
  createCheckpoint,
  diffSpans,
  diffStats,
  discardBranch,
  mergeBranch,
} from '../../model';
import { type Markdown, type Versioning } from '../../types';

export type DocumentHistoryProps = AppSurface.ObjectArticleProps<Markdown.Document>;

/**
 * Companion panel: branch list + checkpoint timeline for the selected branch.
 * Clicking a checkpoint time-travels the editor; clicking a branch switches the editor to it.
 */
export const DocumentHistory = forwardRef<HTMLDivElement, DocumentHistoryProps>(({ role, subject }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const versioning = useVersioning(subject);
  const { document, history, selection, setSelection, activeBranch } = versioning;
  const [naming, setNaming] = useState<'checkpoint' | 'branch' | undefined>(undefined);

  const rootText = document?.content.target;
  const branches = (history?.branches ?? []).filter((branch) => branch.status === 'active');
  // Timeline for the Text the user is currently viewing (root or selected branch).
  const timelineTarget = activeBranch?.content.target ?? rootText;
  const versions = (history?.versions ?? [])
    .filter((version) => version.target.target?.id === timelineTarget?.id)
    .slice()
    .reverse();

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

  const handleSelectBranch = useCallback(
    (branch?: Versioning.Branch) =>
      setSelection(branch ? { kind: 'branch', branchId: branch.id } : { kind: 'current' }),
    [setSelection],
  );

  const handleSelectVersion = useCallback(
    (version?: Versioning.Version) =>
      setSelection(version ? { kind: 'checkpoint', versionId: version.id } : { kind: 'current' }),
    [setSelection],
  );

  const handleMerge = useCallback(
    (branch: Versioning.Branch) => {
      if (document) {
        mergeBranch(document, branch);
        setSelection({ kind: 'current' });
      }
    },
    [document, setSelection],
  );

  const handleDiscard = useCallback(
    (branch: Versioning.Branch) => {
      if (document) {
        discardBranch(document, branch);
        setSelection({ kind: 'current' });
      }
    },
    [document, setSelection],
  );

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

        <SectionTitle title={t('branches.title')} />
        <Row
          icon='ph--git-branch--regular'
          label={t('main-branch.label')}
          detail={selection.kind === 'current' ? t('current.label') : undefined}
          selected={selection.kind === 'current'}
          onClick={() => handleSelectBranch(undefined)}
        />
        <div role='none' className='ms-3 border-is border-separator'>
          {branches.map((branch) => (
            <BranchRow
              key={branch.id}
              branch={branch}
              selected={selection.kind === 'branch' && selection.branchId === branch.id}
              onSelect={() => handleSelectBranch(branch)}
              onMerge={() => handleMerge(branch)}
              onDiscard={() => handleDiscard(branch)}
              mergeLabel={t('merge.label')}
              discardLabel={t('discard-branch.label')}
            />
          ))}
        </div>

        <SectionTitle title={t('checkpoints.title')} />
        <Row
          icon='ph--record--regular'
          label={t('now.label')}
          selected={selection.kind !== 'checkpoint'}
          onClick={() => handleSelectVersion(undefined)}
        />
        {versions.map((version) => (
          <Row
            key={version.id}
            icon='ph--bookmark-simple--regular'
            label={version.name}
            detail={new Date(version.createdAt).toLocaleString()}
            selected={selection.kind === 'checkpoint' && selection.versionId === version.id}
            onClick={() => handleSelectVersion(version)}
          />
        ))}
      </Panel.Content>
    </Panel.Root>
  );
});

DocumentHistory.displayName = 'DocumentHistory';

const SectionTitle = ({ title }: { title: string }) => (
  <h3 className='pli-2 plb-1 mbs-2 text-xs uppercase tracking-wide text-description'>{title}</h3>
);

type RowProps = {
  icon: string;
  label: string;
  detail?: string;
  selected?: boolean;
  onClick: () => void;
};

const Row = ({ icon, label, detail, selected, onClick }: RowProps) => (
  <button
    type='button'
    className={mx(
      'flex items-center gap-2 is-full pli-2 plb-1 text-sm text-start rounded hover:bg-hoverSurface',
      selected && 'bg-hoverSurface',
    )}
    onClick={onClick}
  >
    <Icon icon={icon} size={4} classNames='shrink-0' />
    <span className='truncate'>{label}</span>
    {detail && <span className='ms-auto shrink-0 text-xs text-description'>{detail}</span>}
  </button>
);

type BranchRowProps = {
  branch: Versioning.Branch;
  selected?: boolean;
  onSelect: () => void;
  onMerge: () => void;
  onDiscard: () => void;
  mergeLabel: string;
  discardLabel: string;
};

const BranchRow = ({ branch, selected, onSelect, onMerge, onDiscard, mergeLabel, discardLabel }: BranchRowProps) => {
  const branchText = branch.content.target;
  const parentText = branch.parent.target;
  // Branch Texts are strong children of the document, so targets are normally loaded.
  const stats =
    branchText && parentText
      ? diffStats(diffSpans(contentAt(parentText, branch.anchor), branchText.content))
      : undefined;

  return (
    <div role='none' className={mx('flex items-center rounded hover:bg-hoverSurface', selected && 'bg-hoverSurface')}>
      <button
        type='button'
        className='flex flex-1 items-center gap-2 pli-2 plb-1 text-sm text-start min-w-0'
        onClick={onSelect}
      >
        <Icon icon='ph--git-branch--regular' size={4} classNames='shrink-0' />
        <span className='truncate'>{branch.name}</span>
        {stats && (
          <span className='ms-auto shrink-0 text-xs text-description'>
            +{stats.insertions} −{stats.deletions}
          </span>
        )}
      </button>
      <IconButton variant='ghost' icon='ph--git-merge--regular' iconOnly label={mergeLabel} onClick={onMerge} />
      <IconButton variant='ghost' icon='ph--archive--regular' iconOnly label={discardLabel} onClick={onDiscard} />
    </div>
  );
};

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
