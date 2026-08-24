//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Skeleton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

/**
 * Delay before a pending placeholder starts animating. The square itself is present from the first
 * frame so the rail never reads as empty; only a load slow enough to notice advertises itself.
 */
const PENDING_ANIMATION_DELAY = '2s';

/**
 * Slower than the skeleton default, so a rail of them reads as quietly waiting rather than blinking
 * for attention. The palette stays the achromatic `neutral` ramp: a placeholder should not imply a
 * hue the space has not published yet.
 */
const PENDING_ANIMATION_DURATION = '4s';

/** Fills a rail item's frame while the workspace it stands for is still opening. */
export const L0PendingAvatar = () => (
  <Skeleton
    classNames='w-(--dx-l0-avatar-size) h-(--dx-l0-avatar-size) rounded-sm'
    style={{ animationDelay: PENDING_ANIMATION_DELAY, animationDuration: PENDING_ANIMATION_DURATION }}
  />
);

/**
 * Stands in for the whole space list before the client has initialised, when the app knows it will
 * have workspaces but not yet how many.
 */
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
