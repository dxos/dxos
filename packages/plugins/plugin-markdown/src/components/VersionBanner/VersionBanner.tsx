//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { NamePopover } from '@dxos/plugin-space/components';
import { Button, Icon, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type VersionBannerProps = ThemedClassName<{
  /** Checkpoint mode is read-only time travel; branch mode is an editable draft. */
  mode: 'checkpoint' | 'branch';
  name: string;
  detail?: string;
  onRestore?: () => void;
  onBranchFrom?: (name: string) => void;
  onMerge?: () => void;
  onCompare?: () => void;
  onClose: () => void;
}>;

/**
 * Slim banner shown between the editor toolbar and content while the user is
 * viewing a checkpoint or editing a branch (i.e. off "main @ now").
 */
export const VersionBanner = ({
  classNames,
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
    <div
      role='status'
      className={mx(
        'flex items-center gap-2 pli-2 plb-1 text-sm bg-hoverSurface border-be border-separator',
        classNames,
      )}
    >
      <Icon icon={mode === 'checkpoint' ? 'ph--bookmark-simple--regular' : 'ph--git-branch--regular'} size={4} />
      <span className='truncate'>
        {t(mode === 'checkpoint' ? 'version-banner-checkpoint.label' : 'version-banner-branch.label')}{' '}
        <span className='font-medium'>{name}</span>
        {detail && <span className='text-description'> · {detail}</span>}
      </span>
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
    </div>
  );
};

VersionBanner.displayName = 'VersionBanner';
