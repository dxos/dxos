//
// Copyright 2023 DXOS.org
//

import { Invitation } from '@dxos/react-client/invitations';

export const resolvedBgColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? 'bg-error-surface'
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? 'bg-warning-surface'
      : 'bg-success-surface';

export const resolvedTextColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? 'text-error-fg'
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? 'text-warning-fg'
      : 'text-success-fg';

export const resolvedStrokeColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? 'stroke-error-border'
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? 'stroke-warning-border'
      : 'stroke-success-border';
