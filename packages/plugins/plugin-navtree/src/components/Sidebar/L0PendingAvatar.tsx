//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Status from '@dxos/react-ui/Status';

const PENDING_ANIMATION_DELAY = '2s';

const PENDING_ANIMATION_DURATION = '4s';

export const L0PendingAvatar = () => (
  <Status.Skeleton
    classNames='w-(--dx-l0-avatar-size) h-(--dx-l0-avatar-size) rounded-sm'
    style={{ animationDelay: PENDING_ANIMATION_DELAY, animationDuration: PENDING_ANIMATION_DURATION }}
  />
);
