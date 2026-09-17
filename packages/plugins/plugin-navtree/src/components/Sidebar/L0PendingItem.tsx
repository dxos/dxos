//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Skeleton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

const PENDING_ANIMATION_DELAY = '2s';

const PENDING_ANIMATION_DURATION = '4s';

export const L0PendingAvatar = () => (
  <Skeleton
    classNames='w-(--dx-l0-avatar-size) h-(--dx-l0-avatar-size) rounded-sm'
    style={{ animationDelay: PENDING_ANIMATION_DELAY, animationDuration: PENDING_ANIMATION_DURATION }}
  />
);

export const L0PendingItem = () => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <div
      role='status'
      aria-label={t('pending-workspace.label')}
      data-testid='navtree.workspace.pending'
      className='flex w-full justify-center items-center'
    >
      <L0PendingAvatar />
    </div>
  );
};
