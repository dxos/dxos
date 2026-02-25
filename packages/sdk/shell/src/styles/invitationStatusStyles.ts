//
// Copyright 2023 DXOS.org
//

import { Invitation_State } from '@dxos/react-client/invitations';

// TODO(burdon): Remove and use semantic tokens.
export const inactiveBgColor = 'bg-neutral-100 dark:bg-neutral-600';
export const activeBgColor = 'bg-primary-500 dark:bg-primary-400';
export const successBgColor = 'bg-success-500 dark:bg-success-400';
export const errorBgColor = 'bg-error-500 dark:bg-error-400';
export const cancelledBgColor = 'bg-warning-500 dark:bg-warning-400';

export const inactiveTextColor = 'text-neutral-100 dark:text-neutral-600';
export const activeTextColor = 'text-primary-400 dark:text-primary-500';
export const successTextColor = 'text-success-400 dark:text-success-500';
export const errorTextColor = 'text-error-400 dark:text-error-500';
export const cancelledTextColor = 'text-warning-400 dark:text-warning-500';

export const inactiveStrokeColor = 'stroke-neutral-100 dark:stroke-neutral-700';
export const activeStrokeColor = 'stroke-primary-400 dark:stroke-primary-150';
export const successStrokeColor = 'stroke-success-300 dark:stroke-primary-400';
export const errorStrokeColor = 'stroke-error-300 dark:stroke-error-500';
export const cancelledStrokeColor = 'stroke-warning-300 dark:stroke-warning-500';

export const resolvedStrokeColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? errorStrokeColor
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? cancelledStrokeColor
      : successStrokeColor;

export const resolvedBgColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? errorBgColor
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? cancelledBgColor
      : successBgColor;

export const resolvedTextColor = (status: Invitation_State) =>
  status === Invitation_State.ERROR
    ? errorTextColor
    : status === Invitation_State.CANCELLED || status === Invitation_State.TIMEOUT
      ? cancelledTextColor
      : successTextColor;
