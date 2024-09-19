//
// Copyright 2023 DXOS.org
//

import { Invitation } from '@dxos/react-client/invitations';

export const inactiveBgColor = 'bg-inactiveStatusSurface';
export const activeBgColor = 'bg-activeStatusSurface';
export const successBgColor = 'bg-successStatusSurface';
export const errorBgColor = 'bg-errorStatusSurface';
export const cancelledBgColor = 'bg-warningStatusSurface';

export const inactiveTextColor = 'text-inactiveStatusText';
export const activeTextColor = 'text-activeStatusText';
export const successTextColor = 'text-successStatusText';
export const errorTextColor = 'text-errorStatusText';
export const cancelledTextColor = 'text-warningStatusSex';

export const inactiveStrokeColor = 'stroke-inactiveStatusStroke';
export const activeStrokeColor = 'stroke-activeStatusStroke';
export const successStrokeColor = 'stroke-successStatusStroke';
export const errorStrokeColor = 'stroke-errorStatusStroke';
export const cancelledStrokeColor = 'stroke-warningStatusStroke';

export const resolvedStrokeColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? errorStrokeColor
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? cancelledStrokeColor
      : successStrokeColor;
export const resolvedBgColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? errorBgColor
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? cancelledBgColor
      : successBgColor;
export const resolvedTextColor = (status: Invitation.State) =>
  status === Invitation.State.ERROR
    ? errorTextColor
    : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? cancelledTextColor
      : successTextColor;
