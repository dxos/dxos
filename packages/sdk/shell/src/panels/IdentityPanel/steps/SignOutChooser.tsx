//
// Copyright 2023 DXOS.org
//

import { Warning } from '@phosphor-icons/react';
import React from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { Message, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { Action, Actions } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';
import { type IdentityEvent } from '../identityMachine';

export interface SignOutChooserProps extends Omit<IdentityPanelStepProps, 'send'> {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onResetDevice?: () => Promise<void>;
  onJoinNewIdentity?: () => void;
}

export const SignOutChooser = (props: SignOutChooserProps) => {
  const { t } = useTranslation('os');
  const onResetDevice = () => {
    if (window.confirm(t('reset device confirm message'))) {
      void props.onResetDevice?.();
    }
  };
  return (
    <SignOutChooserImpl
      disabled={!props.active}
      onBack={() => props.send?.({ type: 'unchooseAction' })}
      onResetDevice={onResetDevice}
      onJoinNewIdentity={props.onJoinNewIdentity}
    />
  );
};

export type SignOutChooserImplProps = {
  disabled?: boolean;
  onResetDevice?: () => void;
  onJoinNewIdentity?: () => void;
  onBack?: () => void;
};

const SignOutChooserImpl = ({ disabled, onResetDevice, onJoinNewIdentity, onBack }: SignOutChooserImplProps) => {
  const { t } = useTranslation('os');
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Message.Root valence='error'>
          <Message.Title>
            <Warning className={mx(getSize(6), 'inline mie-2')} />
            {t('sign out chooser title')}
          </Message.Title>
          <Message.Body>{t('sign out chooser message')}</Message.Body>
        </Message.Root>
      </div>
      <Actions>
        <Action disabled={disabled} onClick={onBack}>
          {t('back label')}
        </Action>
        <Action
          variant='destructive'
          data-testid='sign-out.join-new-identity'
          disabled={disabled}
          onClick={onJoinNewIdentity}
        >
          {t('join new identity label')}
        </Action>
        <Action variant='destructive' data-testid='sign-out.reset-device' disabled={disabled} onClick={onResetDevice}>
          {t('reset device label')}
        </Action>
      </Actions>
    </>
  );
};
