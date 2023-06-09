//
// Copyright 2023 DXOS.org
//

import { Invitation } from '@dxos/client';

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
export const activeStrokeColor = 'stroke-primary-500 dark:stroke-primary-150';
export const successStrokeColor = 'stroke-success-400 dark:stroke-primary-400';
export const errorStrokeColor = 'stroke-error-400 dark:stroke-error-500';
export const cancelledStrokeColor = 'stroke-warning-400 dark:stroke-warning-500';

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
