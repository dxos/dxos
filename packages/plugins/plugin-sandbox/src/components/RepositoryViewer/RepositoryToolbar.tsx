//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

import type { BranchInfo } from '../../services/RepositoryClient.ts';

export type RepositoryView = 'files' | 'history';

export type RepositoryToolbarProps = {
  branches: readonly BranchInfo[];
  /** Branch name, or the commit hash being browsed. */
  currentRef?: string;
  view: RepositoryView;
  onRefChange: (ref: string) => void;
  onViewChange: (view: RepositoryView) => void;
  onRefresh: () => void;
};

export const RepositoryToolbar = ({
  branches,
  currentRef,
  view,
  onRefChange,
  onViewChange,
  onRefresh,
}: RepositoryToolbarProps) => {
  const { t } = useTranslation(meta.profile.key);
  const isCommit = currentRef !== undefined && !branches.some((branch) => branch.name === currentRef);
  const commitItem = isCommit && currentRef ? { value: currentRef, label: currentRef.slice(0, 7) } : undefined;
  const branchItems = branches.map((branch) => ({ value: branch.name, label: branch.name }));
  return (
    <Next.Toolbar.Root classNames='gap-1'>
      <Next.Select.Root
        items={commitItem ? [commitItem, ...branchItems] : branchItems}
        value={currentRef ? [currentRef] : []}
        onValueChange={({ value: [value] }) => value && onRefChange(value)}
        disabled={branches.length === 0}
      >
        <Next.Select.Trigger
          classNames='text-sm'
          placeholder={t('branch-select.placeholder')}
          data-testid='repository.branch'
        />
        <Next.Select.Content>
          {commitItem && <Next.Select.Item classNames='text-sm font-mono' item={commitItem} />}
          {branchItems.map((item) => (
            <Next.Select.Item key={item.value} classNames='text-sm' item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Toolbar.Separator />
      <Next.Button
        icon={view === 'files' ? 'ph--clock-counter-clockwise--regular' : 'ph--files--regular'}
        label={t(view === 'files' ? 'show-history.button' : 'show-files.button')}
        onClick={() => onViewChange(view === 'files' ? 'history' : 'files')}
        data-testid='repository.view'
      />
      <Next.Button icon='ph--arrow-clockwise--regular' label={t('refresh.button')} iconOnly onClick={onRefresh} />
    </Next.Toolbar.Root>
  );
};
