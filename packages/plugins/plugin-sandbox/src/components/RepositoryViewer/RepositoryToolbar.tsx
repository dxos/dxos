//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Select, Toolbar, useTranslation } from '@dxos/react-ui';

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
  return (
    <Toolbar.Root classNames='gap-1'>
      <Select.Root value={currentRef} onValueChange={onRefChange} disabled={branches.length === 0}>
        <Select.Trigger
          classNames='text-sm'
          placeholder={t('branch-select.placeholder')}
          data-testid='repository.branch'
        />
        <Select.Content>
          {isCommit && currentRef && (
            <Select.Item classNames='text-sm font-mono' item={{ value: currentRef, label: currentRef.slice(0, 7) }} />
          )}
          {branches.map((branch) => (
            <Select.Item key={branch.name} classNames='text-sm' item={{ value: branch.name, label: branch.name }} />
          ))}
        </Select.Content>
      </Select.Root>
      <Toolbar.Separator />
      <Button
        icon={view === 'files' ? 'ph--clock-counter-clockwise--regular' : 'ph--files--regular'}
        label={t(view === 'files' ? 'show-history.button' : 'show-files.button')}
        onClick={() => onViewChange(view === 'files' ? 'history' : 'files')}
        data-testid='repository.view'
      />
      <Button icon='ph--arrow-clockwise--regular' label={t('refresh.button')} iconOnly onClick={onRefresh} />
    </Toolbar.Root>
  );
};
