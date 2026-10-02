//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const isCommit = currentRef !== undefined && !branches.some((branch) => branch.name === currentRef);
  return (
    <Toolbar.Root classNames='gap-1'>
      <Select.Root value={currentRef} onValueChange={onRefChange} disabled={branches.length === 0}>
        <Select.TriggerButton
          classNames='text-sm'
          placeholder={t('branch-select.placeholder')}
          data-testid='repository.branch'
        />
        <Select.Content>
          {isCommit && currentRef && (
            <Select.Option value={currentRef} classNames='text-sm font-mono'>
              {currentRef.slice(0, 7)}
            </Select.Option>
          )}
          {branches.map((branch) => (
            <Select.Option key={branch.name} value={branch.name} classNames='text-sm'>
              {branch.name}
            </Select.Option>
          ))}
        </Select.Content>
      </Select.Root>
      <Toolbar.Separator />
      <Toolbar.IconButton
        icon={view === 'files' ? 'ph--clock-counter-clockwise--regular' : 'ph--files--regular'}
        label={t(view === 'files' ? 'show-history.button' : 'show-files.button')}
        onClick={() => onViewChange(view === 'files' ? 'history' : 'files')}
        data-testid='repository.view'
      />
      <Toolbar.IconButton
        icon='ph--arrow-clockwise--regular'
        label={t('refresh.button')}
        iconOnly
        onClick={onRefresh}
      />
    </Toolbar.Root>
  );
};
