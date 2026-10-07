//
// Copyright 2023 DXOS.org
//

import { Invitation_State } from '@dxos/react-client/invitations';

/** Surface colour for an invitation state: error, warning for cancelled or timed out, else success. */
export const resolvedBgColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? 'bg-error-surface'
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? 'bg-warning-surface'
      : 'bg-success-surface';

/** Foreground colour for an invitation state: error, warning for cancelled or timed out, else success. */
export const resolvedTextColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? 'text-error-fg'
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? 'text-warning-fg'
      : 'text-success-fg';

/** Border colour for an invitation state: error, warning for cancelled or timed out, else success. */
export const resolvedStrokeColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? 'stroke-error-border'
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? 'stroke-warning-border'
      : 'stroke-success-border';
