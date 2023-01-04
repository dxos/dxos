//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Invitation } from '@dxos/client';
import { strongShimmer, getSize, mx } from '@dxos/react-ui';

const pip = mx('rounded-full flex-none', getSize(2));
const stripe = mx('rounded-full grow', getSize(2));
const inactiveColor = 'bg-neutral-100 dark:bg-neutral-600';
const activeColor = 'bg-primary-500 dark:bg-primary-400';
const successColor = 'bg-success-500 dark:bg-success-400';
const errorColor = 'bg-error-500 dark:bg-error-400';
const cancelledColor = 'bg-warning-500 dark:bg-warning-400';

const statusValueMap = new Map<Invitation.State, number>([
  [Invitation.State.ERROR, -3],
  [Invitation.State.TIMEOUT, -2],
  [Invitation.State.CANCELLED, -1],
  [Invitation.State.INIT, 0],
  [Invitation.State.CONNECTING, 1],
  [Invitation.State.CONNECTED, 2],
  [Invitation.State.AUTHENTICATING, 3],
  [Invitation.State.SUCCESS, 4]
]);

export const InvitationStatus = ({
  status,
  haltedAt,
  ...rootProps
}: ComponentProps<'div'> & {
  status: Invitation.State;
  haltedAt?: Invitation.State;
}) => {
  const { t } = useTranslation();

  const statusLabelMap = useMemo(
    () =>
      new Map<Invitation.State, string>([
        [Invitation.State.ERROR, t('error status label')],
        [Invitation.State.TIMEOUT, t('timeout status label')],
        [Invitation.State.CANCELLED, t('cancelled status label')],
        [Invitation.State.INIT, t('init status label')],
        [Invitation.State.CONNECTING, t('connecting status label')],
        [Invitation.State.CONNECTED, t('connected status label')],
        [Invitation.State.AUTHENTICATING, t('authenticating status label')],
        [Invitation.State.SUCCESS, t('success status label')]
      ]),
    [t]
  );

  const halted =
    status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT || status === Invitation.State.ERROR;

  const cursor = statusValueMap.get(halted ? haltedAt! : status)!;

  const resolvedColor =
    status === Invitation.State.ERROR
      ? errorColor
      : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? cancelledColor
      : successColor;

  return (
    <div
      role='status'
      aria-label={statusLabelMap.get(status)}
      {...rootProps}
      className={mx('flex gap-2 items-center', rootProps.className)}
    >
      <div role='none' className={mx(pip, 'relative')}>
        <div
          role='none'
          className={mx(pip, 'absolute', !halted && cursor === 0 ? 'animate-ping block' : 'hidden', activeColor)}
        />
        <div
          role='none'
          className={mx(
            pip,
            'relative',
            cursor === 0 ? (halted ? resolvedColor : activeColor) : cursor > 0 ? resolvedColor : inactiveColor
          )}
        />
      </div>
      <div
        role='none'
        className={mx(
          stripe,
          !halted && cursor === 1 && strongShimmer,
          cursor === 1 ? (halted ? resolvedColor : activeColor) : cursor > 1 ? resolvedColor : inactiveColor
        )}
      />
      <div role='none' className={mx(pip, 'relative')}>
        <div
          role='none'
          className={mx(pip, 'absolute', !halted && cursor === 2 ? 'animate-ping block' : 'hidden', activeColor)}
        />
        <div
          role='none'
          className={mx(
            pip,
            'relative',
            cursor === 2 ? (halted ? resolvedColor : activeColor) : cursor > 2 ? resolvedColor : inactiveColor
          )}
        />
      </div>
      <div
        role='none'
        className={mx(
          stripe,
          !halted && cursor === 3 && strongShimmer,
          cursor === 3 ? activeColor : cursor > 3 ? (halted ? resolvedColor : resolvedColor) : inactiveColor
        )}
      />
      <div role='none' className={mx(pip, cursor >= 4 ? resolvedColor : inactiveColor)} />
    </div>
  );
};
