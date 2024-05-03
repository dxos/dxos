//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEvent, useState } from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { hexToEmoji } from '@dxos/util';

import { Actions, Action, Emoji, StepHeading } from '../../../components';
import { type JoinStepProps } from '../JoinPanelProps';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  failed?: boolean;
  pending?: boolean;
  invitationId?: string;
  onInvitationCancel?: () => Promise<void> | undefined;
  onInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
}

export const InvitationAuthenticator = ({
  failed,
  Kind,
  active,
  pending,
  invitationId,
  onInvitationAuthenticate,
  onInvitationCancel,
}: InvitationAuthenticatorProps) => {
  const disabled = !active || pending;
  const { t } = useTranslation('os');
  const invitationType = Kind.toLowerCase() as 'space' | 'halo';
  const [authCode, setAuthCode] = useState('');

  const onChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
    setAuthCode(value);
    if (value.length === pinLength) {
      (document.querySelector(`[data-autofocus-pinlength="${invitationType}"]`) as HTMLElement | null)?.focus();
    }
  };

  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        {invitationId && <Emoji text={hexToEmoji(invitationId)} />}
        <Input.Root
          {...(failed && {
            validationValence: 'error',
          })}
        >
          <Input.Label asChild>
            <StepHeading>{t('auth code input label')}</StepHeading>
          </Input.Label>
          <Input.PinInput
            {...{
              disabled,
              length: pinLength,
              onChange,
              inputMode: 'numeric',
              autoComplete: 'off',
              pattern: '\\d*',
              'data-autofocus': `connecting${Kind}Invitation inputting${Kind}VerificationCode authenticationFailing${Kind}VerificationCode authenticating${Kind}VerificationCode`,
              'data-prevent-ios-autofocus': true,
              'data-testid': `${invitationType}-auth-code-input`,
              'data-1p-ignore': true,
            }}
          />
          {failed && (
            <Input.DescriptionAndValidation classNames='text-center'>
              <Input.Validation>{t('failed to authenticate message')}</Input.Validation>
            </Input.DescriptionAndValidation>
          )}
        </Input.Root>
      </div>
      <Actions>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => onInvitationCancel?.()}
          data-testid={`${invitationType}-invitation-authenticator-cancel`}
        >
          {t('cancel label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() => onInvitationAuthenticate?.(authCode)}
          data-autofocus-pinlength={invitationType}
          data-testid={`${invitationType}-invitation-authenticator-next`}
        >
          {t('next label')}
        </Action>
      </Actions>
    </>
  );
};
