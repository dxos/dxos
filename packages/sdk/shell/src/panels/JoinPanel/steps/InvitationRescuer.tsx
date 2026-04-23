//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Invitation } from '@dxos/react-client/invitations';
import { useTranslation } from '@dxos/react-ui';

import { Action, ActionBar, InputLabel } from '../../../components';
import { translationKey } from '../../../translations';
import { type FailReason } from '../../../types';
import { type JoinStepProps } from '../JoinPanelProps';

export interface InvitationRescuerProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  invitationState?: Invitation.State;
  onInvitationCancel?: () => Promise<void> | undefined;
  failReason?: FailReason | null;
}

const InvitationActions = ({
  // `invitationState` does report correct state, but here we evaluate whether `failReason` is a better source of truth
  // for the UI in particular.
  invitationState,
  onInvitationCancel,
  active,
  send,
  Kind,
  failReason,
}: InvitationRescuerProps) => {
  const { t } = useTranslation(translationKey);

  if (failReason) {
    return (
      <>
        <InputLabel classNames='text-description'>
          {t(
            failReason === 'timeout'
              ? 'timeout status label'
              : failReason === 'cancelled'
                ? 'cancelled status label'
                : 'error status label',
          )}
        </InputLabel>
        <div role='none' className='grow' />
        <ActionBar>
          <Action
            disabled={!active}
            onClick={() => send({ type: `reset${Kind}Invitation` })}
            data-testid='invitation-rescuer-reset'
          >
            {t('reset.label')}
          </Action>
        </ActionBar>
      </>
    );
  } else {
    return (
      <>
        <InputLabel classNames='text-description'>{t('connecting-status.label')}</InputLabel>
        <div role='none' className='grow' />
        <ActionBar>
          <Action disabled classNames='order-2' data-testid='next'>
            {t('next.label')}
          </Action>
          <Action disabled={!active} onClick={onInvitationCancel} data-testid='invitation-rescuer-cancel'>
            {t('cancel.label')}
          </Action>
        </ActionBar>
      </>
    );
  }
};

export const InvitationRescuer = (props: InvitationRescuerProps) => {
  const { Kind, invitationState, active, send } = props;
  const { t } = useTranslation(translationKey);

  return (
    <>
      {typeof invitationState === 'undefined' ? (
        <>
          <div role='none' className='grow flex flex-col justify-center'>
            <InputLabel classNames='text-description'>There was a problem joining the space</InputLabel>
          </div>
          <ActionBar>
            <Action
              disabled={!active}
              data-testid='invitation-rescuer-blank-reset'
              onClick={() => send({ type: `reset${Kind}Invitation` })}
            >
              {t('reset.label')}
            </Action>
          </ActionBar>
        </>
      ) : (
        <InvitationActions {...props} />
      )}
    </>
  );
};
