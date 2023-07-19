//
// Copyright 2023 DXOS.org
//

import { CheckCircle, HourglassSimple, X } from '@phosphor-icons/react';
import React, { ComponentProps, ComponentPropsWithoutRef, ReactNode, useMemo } from 'react';

import { useTranslation, useId } from '@dxos/aurora';
import { getSize, strongShimmer, mx } from '@dxos/aurora-theme';
import {
  type AuthenticatingInvitationObservable,
  Invitation,
  useInvitationStatus,
} from '@dxos/react-client/invitations';

import { defaultSurface, resolvedBgColor, activeBgColor, inactiveBgColor } from '../../../styles';
import { invitationStatusValue } from '../../../util';
import { JoinSend, JoinState } from '../joinMachine';

export interface ViewStateProps extends ComponentProps<'div'> {
  active: boolean;
  joinSend: JoinSend;
  joinState?: JoinState;
}

const stripe = mx('rounded-full grow', getSize(3));

export const ViewStateHeading = ({ children, className, ...props }: ComponentPropsWithoutRef<'h2'>) => {
  return (
    <h2 {...props} className={mx('font-system-normal text-sm mbe-1 mli-1 text-center', className)}>
      {children}
    </h2>
  );
};

const PureViewStateInvitation = ({
  halted,
  cursor,
  label,
  resolvedColor,
}: {
  halted?: boolean;
  cursor: number;
  label: ReactNode;
  resolvedColor: string;
}) => {
  const labelId = useId('invitationState');
  return (
    <div role='none' className={mx(defaultSurface, 'pli-2 pbs-2')}>
      <div role='status' aria-labelledby={labelId} className='flex gap-2 items-center mlb-1'>
        <div
          role='none'
          className={mx(
            stripe,
            !halted && cursor === 1 && strongShimmer,
            cursor === 2 ? (halted ? resolvedColor : activeBgColor) : cursor > 1 ? resolvedColor : inactiveBgColor,
          )}
        />
        <div
          role='none'
          className={mx(
            stripe,
            !halted && cursor === 3 && strongShimmer,
            cursor === 3 ? (halted ? resolvedColor : activeBgColor) : cursor > 3 ? resolvedColor : inactiveBgColor,
          )}
        />
        <div
          role='none'
          className={mx(stripe, cursor > 3 ? (halted ? resolvedColor : resolvedColor) : inactiveBgColor)}
        />
      </div>
      <ViewStateHeading id={labelId} className='mbs-2 flex justify-center items-center gap-2'>
        {label}
      </ViewStateHeading>
    </div>
  );
};

// TODO(thure): Restore this?
const _ViewStateInvitationStatus = ({ activeInvitation }: { activeInvitation: AuthenticatingInvitationObservable }) => {
  const { t } = useTranslation('os');
  const { status, haltedAt } = useInvitationStatus(activeInvitation);

  const halted =
    status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT || status === Invitation.State.ERROR;

  const cursor = invitationStatusValue.get(halted ? haltedAt! : status)!;

  const resolvedColor = resolvedBgColor(status);

  const statusLabelMap = useMemo(
    () =>
      new Map<Invitation.State, ReactNode>([
        [
          Invitation.State.ERROR,
          <>
            <X weight='bold' className={mx(getSize(4), 'text-error-600 dark:text-error-400')} />
            <span>{t('error status label')}</span>
          </>,
        ],
        [
          Invitation.State.TIMEOUT,
          <>
            <HourglassSimple weight='fill' className={mx(getSize(4), 'text-warning-600 dark:text-warning-400')} />
            <span>{t('timeout status label')}</span>
          </>,
        ],
        [
          Invitation.State.CANCELLED,
          <>
            <X weight='bold' className={mx(getSize(4), 'text-warning-600 dark:text-warning-400')} />
            <span>{t('cancelled status label')}</span>
          </>,
        ],
        [Invitation.State.INIT, t('init status label')],
        [Invitation.State.CONNECTING, t('connecting status label')],
        [Invitation.State.CONNECTED, t('connected status label')],
        [Invitation.State.AUTHENTICATING, t('authenticating status label')],
        [
          Invitation.State.SUCCESS,
          <>
            <CheckCircle weight='fill' className={mx(getSize(4), 'text-success-600 dark:text-success-400')} />
            <span>{t('success status label')}</span>
          </>,
        ],
      ]),
    [t],
  );

  return (
    <PureViewStateInvitation
      {...{
        label: statusLabelMap.get(status)!,
        resolvedColor,
        cursor,
        halted,
      }}
    />
  );
};

export const ViewState = ({ active, children, className, joinSend, joinState, ...props }: ViewStateProps) => {
  // note (thure): reserve `order-1` and `order-3` for outgoing steps in different directions
  return (
    <div
      role='none'
      {...props}
      {...(!active && { 'aria-hidden': true })}
      className={mx('is-[50%] flex flex-col', active ? 'order-2' : 'order-4', className)}
    >
      <div role='region' className={mx(defaultSurface, 'rounded-be-md grow shrink-0 flex flex-col gap-1 p-4 pbs-1')}>
        {children}
      </div>
    </div>
  );
};
