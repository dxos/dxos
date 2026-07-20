//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { NamePopover } from '@dxos/app-framework/ui';
import { Icon, IconButton, Tag, TextTooltip, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

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
  onCompare?: () => void;
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
  onCompare,
  onClose,
}: VersionBannerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [namingBranch, setNamingBranch] = useState(false);

  return (
    <Toolbar.Root data-testid={`version-banner-${mode}`}>
      <div className='flex items-center gap-0.5 px-1 truncate'>
        <Tag classNames='flex gap-2'>
          <Icon icon={mode === 'checkpoint' ? 'ph--bookmark-simple--regular' : 'ph--git-branch--regular'} />
          {name}
        </Tag>
        {timestamp && (
          <TextTooltip text={new Date(timestamp).toLocaleString()} side='bottom'>
            <Tag hue='indigo'>{relativeTime(timestamp)}</Tag>
          </TextTooltip>
        )}
      </div>
      <Toolbar.Separator />
      <div className='flex items-center gap-1 ms-auto'>
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
            <Toolbar.Button density='sm' variant='ghost' onClick={() => setNamingBranch(true)}>
              {t('branch-from.label')}
            </Toolbar.Button>
          </NamePopover>
        )}
        {mode === 'branch' && onCompare && (
          <Toolbar.IconButton
            variant='ghost'
            icon='ph--git-diff--regular'
            iconOnly
            label={t('compare.label')}
            onClick={onCompare}
          />
        )}
        {mode === 'branch' && onMerge && (
          <Toolbar.IconButton
            variant='ghost'
            icon='ph--git-merge--regular'
            label={t('merge.label')}
            iconOnly
            onClick={onMerge}
          />
        )}
        <IconButton variant='ghost' icon='ph--x--regular' iconOnly label={t('close.label')} onClick={onClose} />
      </div>
    </Toolbar.Root>
  );
};

VersionBanner.displayName = 'VersionBanner';
