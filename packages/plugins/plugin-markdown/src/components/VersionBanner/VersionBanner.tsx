//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { NamePopover } from '@dxos/app-framework/ui';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { Icon, IconButton, Tag, TextTooltip, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

type BranchView = SpaceCapabilities.BranchView;

/** The `base`/`diff`/`branch` view options, in banner display order. */
const BRANCH_VIEWS: BranchView[] = ['base', 'diff', 'branch'];

const isBranchView = (value: string): value is BranchView => (BRANCH_VIEWS as string[]).includes(value);

/** Compact "time since" for the banner tag — `now`, `30m`, `5h`, `2d`, `3w`, `6mo`, `1y`. */
const relativeTime = (iso: string): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w`;
  }
  if (days < 365) {
    return `${Math.floor(days / 30)}mo`;
  }
  return `${Math.floor(days / 365)}y`;
};

export type VersionBannerProps = {
  /**
   * Checkpoint mode is read-only time travel; branch mode is an editable draft; fork mode is a
   * read-only view of a branch's creation point.
   */
  mode: 'checkpoint' | 'branch' | 'fork';
  name: string;
  /** ISO timestamp — shown as a compact age tag (`2d`, `5h`, `30m`) with the full date in a tooltip. */
  timestamp?: string;
  onRestore?: () => void;
  onBranchFrom?: (name: string) => void;
  onMerge?: () => void;
  /** Active branch view; renders the `[Base | Diff | Branch]` selector when paired with `onViewChange`. */
  view?: BranchView;
  onViewChange?: (view: BranchView) => void;
  onClose: () => void;
};

/**
 * Slim banner shown between the editor toolbar and content while the user is
 * viewing a checkpoint or editing a branch (i.e. off "main @ now").
 */
export const VersionBanner = ({
  mode,
  name,
  timestamp,
  onRestore,
  onBranchFrom,
  onMerge,
  view,
  onViewChange,
  onClose,
}: VersionBannerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [namingBranch, setNamingBranch] = useState(false);

  return (
    <Toolbar.Root data-testid={`version-banner-${mode}`} aria-live='polite'>
      <div className='flex items-center gap-1 px-2 truncate'>
        <Icon icon={mode === 'checkpoint' ? 'ph--bookmark-simple--regular' : 'ph--git-branch--regular'} />
        <Tag hue='neutral' classNames='flex gap-2'>
          {name}
        </Tag>
        {timestamp && (
          <TextTooltip text={new Date(timestamp).toLocaleString()} side='bottom'>
            <Tag hue='sky'>{relativeTime(timestamp)}</Tag>
          </TextTooltip>
        )}
      </div>
      <Toolbar.Separator />
      {mode === 'checkpoint' && onRestore && (
        <Toolbar.Button variant='ghost' onClick={onRestore}>
          {t('restore.label')}
        </Toolbar.Button>
      )}
      {mode === 'checkpoint' && onBranchFrom && (
        <NamePopover
          open={namingBranch}
          placeholder={t('branch-name.placeholder')}
          submitLabel={t('create.label')}
          onCancel={() => setNamingBranch(false)}
          onSubmit={(name) => {
            setNamingBranch(false);
            onBranchFrom(name);
          }}
        >
          <Toolbar.Button variant='ghost' onClick={() => setNamingBranch(true)}>
            {t('branch-from.label')}
          </Toolbar.Button>
        </NamePopover>
      )}
      {mode === 'branch' && view && onViewChange && (
        <Toolbar.ToggleGroup
          type='single'
          value={view}
          // Radix emits '' when the active item is toggled off; ignore it so a view is always selected.
          onValueChange={(next) => isBranchView(next) && onViewChange(next)}
        >
          {BRANCH_VIEWS.map((option) => (
            <Toolbar.ToggleGroupItem key={option} value={option} data-testid={`version-banner-view-${option}`}>
              {t(`branch-view-${option}.label`)}
            </Toolbar.ToggleGroupItem>
          ))}
        </Toolbar.ToggleGroup>
      )}
      {mode === 'branch' && onMerge && (
        <Toolbar.IconButton variant='ghost' icon='ph--git-merge--regular' label={t('merge.label')} onClick={onMerge} />
      )}
      <IconButton variant='ghost' icon='ph--x--regular' iconOnly label={t('close.label')} onClick={onClose} />
    </Toolbar.Root>
  );
};

VersionBanner.displayName = 'VersionBanner';
