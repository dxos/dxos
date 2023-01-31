//
// Copyright 2023 DXOS.org
//

import { CheckCircle, HourglassSimple, X } from 'phosphor-react';
import React, { ComponentProps, ComponentPropsWithoutRef, ReactNode, useMemo } from 'react';

import type { AuthenticatingInvitationObservable, Profile } from '@dxos/client';
import { Invitation } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { mx, useTranslation, Trans, Avatar, useId, getSize, strongShimmer } from '@dxos/react-components';

import { defaultSurface, subduedSurface } from '../../../styles';
import { invitationStatusValue } from '../../../util';
import { JoinDispatch } from '../JoinPanelProps';

export interface ViewStateProps extends ComponentProps<'div'> {
  active: boolean;
  dispatch: JoinDispatch;
  selectedIdentity?: true | Profile;
  activeInvitation?: true | AuthenticatingInvitationObservable;
}

const stripe = mx('rounded-full grow', getSize(3));
const inactiveColor = 'bg-neutral-100 dark:bg-neutral-600';
const activeColor = 'bg-primary-500 dark:bg-primary-400';
const successColor = 'bg-success-500 dark:bg-success-400';
const errorColor = 'bg-error-500 dark:bg-error-400';
const cancelledColor = 'bg-warning-500 dark:bg-warning-400';

export const ViewStateHeading = ({ children, className, ...props }: ComponentPropsWithoutRef<'h2'>) => {
  return (
    <h2 {...props} className={mx('font-system-medium text-sm md:text-base mbe-1 mli-1 text-center', className)}>
      {children}
    </h2>
  );
};

const PureViewStateInvitation = ({
  halted,
  cursor,
  label,
  resolvedColor
}: {
  halted?: boolean;
  cursor: number;
  label: ReactNode;
  resolvedColor: string;
}) => {
  const labelId = useId('invitationState');
  return (
    <div role='none' className={mx(defaultSurface, 'pli-3 pbs-3')}>
      <div role='status' aria-labelledby={labelId} className='flex gap-2 items-center mlb-1'>
        <div
          role='none'
          className={mx(
            stripe,
            !halted && cursor === 1 && strongShimmer,
            cursor === 2 ? (halted ? resolvedColor : activeColor) : cursor > 1 ? resolvedColor : inactiveColor
          )}
        />
        <div
          role='none'
          className={mx(
            stripe,
            !halted && cursor === 3 && strongShimmer,
            cursor === 3 ? (halted ? resolvedColor : activeColor) : cursor > 3 ? resolvedColor : inactiveColor
          )}
        />
        <div
          role='none'
          className={mx(stripe, cursor > 3 ? (halted ? resolvedColor : resolvedColor) : inactiveColor)}
        />
      </div>
      <ViewStateHeading id={labelId} className='mbs-2 flex justify-center items-center gap-2'>
        {label}
      </ViewStateHeading>
    </div>
  );
};

const ViewStateInvitationStatus = ({ activeInvitation }: { activeInvitation: AuthenticatingInvitationObservable }) => {
  const { t } = useTranslation('os');
  const { status, haltedAt } = useInvitationStatus(activeInvitation);

  const halted =
    status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT || status === Invitation.State.ERROR;

  const cursor = invitationStatusValue.get(halted ? haltedAt! : status)!;

  const resolvedColor =
    status === Invitation.State.ERROR
      ? errorColor
      : status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT
      ? cancelledColor
      : successColor;

  const statusLabelMap = useMemo(
    () =>
      new Map<Invitation.State, ReactNode>([
        [
          Invitation.State.ERROR,
          <>
            <X weight='bold' className={mx(getSize(4), 'text-error-600 dark:text-error-400')} />
            <span>{t('error status label')}</span>
          </>
        ],
        [
          Invitation.State.TIMEOUT,
          <>
            <HourglassSimple weight='fill' className={mx(getSize(4), 'text-warning-600 dark:text-warning-400')} />
            <span>{t('timeout status label')}</span>
          </>
        ],
        [
          Invitation.State.CANCELLED,
          <>
            <X weight='bold' className={mx(getSize(4), 'text-warning-600 dark:text-warning-400')} />
            <span>{t('cancelled status label')}</span>
          </>
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
          </>
        ]
      ]),
    [t]
  );

  return (
    <PureViewStateInvitation
      {...{
        label: statusLabelMap.get(status)!,
        resolvedColor,
        cursor,
        halted
      }}
    />
  );
};

export const ViewState = ({
  active,
  children,
  className,
  dispatch,
  selectedIdentity,
  activeInvitation,
  ...props
}: ViewStateProps) => {
  // note (thure): reserve `order-1` and `order-3` for outgoing steps in different directions
  const { t } = useTranslation('os');
  const identityLabel = useId('selectedIdentityLabel');

  return (
    <div
      role='none'
      {...props}
      {...(!active && { 'aria-hidden': true })}
      className={mx('is-[50%] flex flex-col', active ? 'order-2' : 'order-4', className)}
    >
      {selectedIdentity && (
        <div role='none' className={mx(subduedSurface, 'flex-none flex items-center gap-1 pli-2 pbe-1.5')}>
          <Trans
            {...{
              defaults: t('join space as identity heading'),
              components: {
                icon: (
                  <Avatar
                    size={4}
                    fallbackValue={selectedIdentity === true ? '' : selectedIdentity.identityKey.toHex()}
                    labelId={identityLabel}
                  />
                ),
                label: <span id={identityLabel} />,
                part: <span role='none' className='flex items-center gap-1 leading-none' />
              },
              values: {
                labelValue:
                  selectedIdentity === true
                    ? ' '
                    : selectedIdentity.displayName ?? selectedIdentity.identityKey.truncate()
              }
            }}
          />
        </div>
      )}
      {activeInvitation &&
        (activeInvitation === true ? (
          <PureViewStateInvitation
            {...{ halted: false, status: Invitation.State.INIT, label: ' ', cursor: 0, resolvedColor: inactiveColor }}
          />
        ) : (
          <ViewStateInvitationStatus {...{ activeInvitation }} />
        ))}
      <div role='region' className={mx(defaultSurface, 'rounded-be-md grow shrink-0 flex flex-col gap-1 p-2')}>
        {children}
      </div>
    </div>
  );
};
