//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Invitation } from '@dxos/client';
import { strongShimmer, getSize } from '@dxos/react-ui';

const pip = cx('rounded-full flex-none', getSize(3));
const stripe = cx('rounded-full grow', getSize(2));
const inactiveColor = 'bg-neutral-100 dark:bg-neutral-600';
const activeColor = 'bg-primary-500 dark:bg-primary-400';
const successColor = 'bg-success-500 dark:bg-success-400';
const errorColor = 'bg-error-500 dark:bg-error-400';
const cancelledColor = 'bg-warning-500 dark:bg-warning-400';

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
        [Invitation.State.ERROR, t('failed status label')],
        [Invitation.State.CANCELLED, t('cancelled status label')],
        [Invitation.State.INIT, t('init status label')],
        [Invitation.State.CONNECTING, t('init status connecting')],
        [Invitation.State.CONNECTED, t('ready status connecting')],
        [Invitation.State.AUTHENTICATING, t('validating status connecting')],
        [Invitation.State.SUCCESS, t('done status connecting')]
      ]),
    [t]
  );

  const cursor = status < 0 ? haltedAt! - 1 : status;
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
      className={cx('flex gap-2 items-center', rootProps.className)}
    >
      <div role='none' className={cx(pip, 'relative')}>
        <div role='none' className={cx(pip, 'absolute', cursor === 0 ? 'animate-ping block' : 'hidden', activeColor)} />
        <div
          role='none'
          className={cx(pip, 'relative', cursor === 0 ? activeColor : cursor > 0 ? resolvedColor : inactiveColor)}
        />
      </div>
      <div
        role='none'
        className={cx(
          stripe,
          cursor === 1 && strongShimmer,
          cursor === 1 ? activeColor : cursor > 1 ? resolvedColor : inactiveColor
        )}
      />
      <div role='none' className={cx(pip, 'relative')}>
        <div role='none' className={cx(pip, 'absolute', cursor === 2 ? 'animate-ping block' : 'hidden', activeColor)} />
        <div
          role='none'
          className={cx(pip, 'relative', cursor === 2 ? activeColor : cursor > 2 ? resolvedColor : inactiveColor)}
        />
      </div>
      <div
        role='none'
        className={cx(
          stripe,
          cursor === 3 && strongShimmer,
          cursor === 3 ? activeColor : cursor > 3 ? resolvedColor : inactiveColor
        )}
      />
      <div role='none' className={cx(pip, cursor >= 4 ? resolvedColor : inactiveColor)} />
    </div>
  );
};
