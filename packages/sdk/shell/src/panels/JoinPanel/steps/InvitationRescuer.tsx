//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Invitation_State } from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { InputLabel } from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { type FailReason } from '../../../types/index.ts';
import { type JoinStepProps } from '../JoinPanelProps.ts';

export interface InvitationRescuerProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  invitationState?: Invitation_State;
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
  const { t } = Hooks.useTranslation(translationKey);

  if (failReason) {
    return (
      <>
        <InputLabel classNames='text-fg-muted'>
          {t(
            failReason === 'timeout'
              ? 'timeout status label'
              : failReason === 'cancelled'
                ? 'cancelled status label'
                : 'error status label',
          )}
        </InputLabel>
        <div className='grow' />
        <Dialog.Footer>
          <Button.Root
            disabled={!active}
            onClick={() => send({ type: `reset${Kind}Invitation` })}
            data-testid='invitation-rescuer-reset'
          >
            {t('reset.label')}
          </Button.Root>
        </Dialog.Footer>
      </>
    );
  } else {
    return (
      <>
        <InputLabel classNames='text-fg-muted'>{t('connecting-status.label')}</InputLabel>
        <div className='grow' />
        <Dialog.Footer>
          <Button.Root
            variant='ghost'
            disabled={!active}
            onClick={onInvitationCancel}
            data-testid='invitation-rescuer-cancel'
          >
            {t('cancel.label')}
          </Button.Root>
          <Button.Root variant='primary' disabled data-testid='next'>
            {t('next.label')}
          </Button.Root>
        </Dialog.Footer>
      </>
    );
  }
};

export const InvitationRescuer = (props: InvitationRescuerProps) => {
  const { Kind, invitationState, active, send } = props;
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <>
      {typeof invitationState === 'undefined' ? (
        <>
          <div className='grow flex flex-col justify-center'>
            <InputLabel classNames='text-fg-muted'>There was a problem joining the space</InputLabel>
          </div>
          <Dialog.Footer>
            <Button.Root
              disabled={!active}
              data-testid='invitation-rescuer-blank-reset'
              onClick={() => send({ type: `reset${Kind}Invitation` })}
            >
              {t('reset.label')}
            </Button.Root>
          </Dialog.Footer>
        </>
      ) : (
        <InvitationActions {...props} />
      )}
    </>
  );
};
