//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Invitation } from '@dxos/client';
import { getSize, mx, Size } from '@dxos/react-components';

export interface InvitationStatusAvatarProps {
  size?: Size;
  status: Invitation.State;
  haltedAt?: Invitation.State;
}

const colorMap: Record<Invitation.State, string> = {
  [Invitation.State.ERROR]: 'text-error-400 dark:text-error-500',
  [Invitation.State.TIMEOUT]: 'text-warn-400 dark:text-warn-500',
  [Invitation.State.CANCELLED]: 'text-warn-400 dark:text-warn-500',
  [Invitation.State.INIT]: 'text-primary-400 dark:text-primary-500',
  [Invitation.State.CONNECTING]: 'text-primary-400 dark:text-primary-500',
  [Invitation.State.CONNECTED]: 'text-primary-400 dark:text-primary-500',
  [Invitation.State.AUTHENTICATING]: 'text-primary-400 dark:text-primary-500',
  [Invitation.State.SUCCESS]: 'text-success-400 dark:text-success-500'
};

export const InvitationStatusAvatar = ({ size = 10, status, haltedAt }: InvitationStatusAvatarProps) => {
  return (
    <span
      role='status'
      className={mx('inline-flex items-center justify-center font-system-black', getSize(size), colorMap[status])}
    >
      {(haltedAt || status).toString()}
    </span>
  );
};
