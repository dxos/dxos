//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { NamePopover } from '@dxos/app-framework/ui';
import { Button, Icon, IconButton, Tag, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type VersionBannerProps = {
  /**
   * Checkpoint mode is read-only time travel; branch mode is an editable draft; fork mode is a
   * read-only view of a branch's creation point.
   */
  mode: 'checkpoint' | 'branch' | 'fork';
  name: string;
  /** Compact age shown as a tag (e.g. `2d`, `5h`, `30m`) — the banner has no room for a full date. */
  detail?: string;
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
  detail,
  onRestore,
  onBranchFrom,
  onMerge,
  onCompare,
  onClose,
}: VersionBannerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [namingBranch, setNamingBranch] = useState(false);

  return (
    <Toolbar.Root>
      <div className='flex items-center gap-0.5 px-1 truncate'>
        {/* Visually hidden: the banner is compact (icon + name + age), but the mode label stays in
            the DOM for screen readers and text-based tests. */}
        <span className='sr-only'>{t(`version-banner-${mode}.label`)}</span>
        <Tag classNames='flex gap-2'>
          <Icon icon={mode === 'checkpoint' ? 'ph--bookmark-simple--regular' : 'ph--git-branch--regular'} />
          {name}
        </Tag>
        {detail && <Tag hue='green'>{detail}</Tag>}
      </div>
      <Toolbar.Separator />
      <div className='flex items-center gap-1 ms-auto'>
        {mode === 'checkpoint' && onRestore && (
          <Button density='sm' variant='ghost' onClick={onRestore}>
            {t('restore.label')}
          </Button>
        )}
        {mode === 'checkpoint' && onBranchFrom && (
          <NamePopover
            open={namingBranch}
            placeholder={t('branch-name.placeholder')}
            submitLabel={t('create.label')}
            onSubmit={(name) => {
              setNamingBranch(false);
              onBranchFrom(name);
            }}
            onCancel={() => setNamingBranch(false)}
          >
            <Button density='sm' variant='ghost' onClick={() => setNamingBranch(true)}>
              {t('branch-from.label')}
            </Button>
          </NamePopover>
        )}
        {mode === 'branch' && onCompare && (
          <Button density='sm' variant='ghost' onClick={onCompare}>
            {t('compare.label')}
          </Button>
        )}
        {mode === 'branch' && onMerge && (
          <Button density='sm' variant='ghost' onClick={onMerge}>
            {t('merge.label')}
          </Button>
        )}
        <IconButton
          density='sm'
          variant='ghost'
          icon='ph--x--regular'
          iconOnly
          label={t('close.label')}
          onClick={onClose}
        />
      </div>
    </Toolbar.Root>
  );
};

VersionBanner.displayName = 'VersionBanner';
