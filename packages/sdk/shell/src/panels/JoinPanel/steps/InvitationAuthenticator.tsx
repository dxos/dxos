//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEvent, useState } from 'react';

import { Invitation_AuthMethod } from '@dxos/react-client/invitations';
import { Field, useTranslation } from '@dxos/react-ui';
import { hexToEmoji } from '@dxos/util';

import { Action, ActionBar, Emoji, InputLabel, Label } from '../../../components';
import { translationKey } from '../../../translations';
import { type JoinStepProps } from '../JoinPanelProps';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  authMethod?: Invitation_AuthMethod;
  failed?: boolean;
  pending?: boolean;
  invitationId?: string;
  onInvitationCancel?: () => Promise<void> | undefined;
  onInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
}

export const InvitationAuthenticator = ({
  failed,
  Kind,
  authMethod,
  active,
  pending,
  invitationId,
  onInvitationAuthenticate,
  onInvitationCancel,
}: InvitationAuthenticatorProps) => {
  const disabled = !active || pending;
  const { t } = useTranslation(translationKey);
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
      <div className='grow flex flex-col justify-center gap-4'>
        <Field.Root
          {...(failed && {
            validationValence: 'error',
          })}
        >
          {authMethod === Invitation_AuthMethod.SHARED_SECRET ? (
            <Field.Label asChild>
              <InputLabel>{t('auth-code-input.label')}</InputLabel>
            </Field.Label>
          ) : (
            <>
              <Field.Label>
                <InputLabel classNames='text-description'>{t('authenticating.label')}</InputLabel>
              </Field.Label>
              <div className='grow' />
            </>
          )}
          {authMethod === Invitation_AuthMethod.SHARED_SECRET && (
            <Field.PinInput
              {...{
                disabled,
                'density': 'lg',
                'length': pinLength,
                'inputMode': 'numeric',
                'autoComplete': 'off',
                'pattern': '\\d*',
                onChange,
                'data-autofocus': `connecting${Kind}Invitation inputting${Kind}VerificationCode authenticationFailing${Kind}VerificationCode authenticating${Kind}VerificationCode`,
                'data-prevent-ios-autofocus': true,
                'data-testid': `${invitationType}-auth-code-input`,
                'data-1p-ignore': true,
              }}
            />
          )}
          {failed && <Field.ErrorText classNames='text-center'>{t('failed-to-authenticate.message')}</Field.ErrorText>}
        </Field.Root>

        {invitationId && authMethod === Invitation_AuthMethod.SHARED_SECRET && (
          <>
            <Label>{t('auth-other-device-emoji.message')}</Label>
            <div className='flex justify-center'>
              <Emoji text={hexToEmoji(invitationId)} />
            </div>
          </>
        )}
      </div>
      <ActionBar>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => onInvitationCancel?.()}
          data-testid={`${invitationType}-invitation-authenticator-cancel`}
        >
          {t('cancel.label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() => onInvitationAuthenticate?.(authCode)}
          data-autofocus-pinlength={invitationType}
          data-testid={`${invitationType}-invitation-authenticator-next`}
        >
          {t('next.label')}
        </Action>
      </ActionBar>
    </>
  );
};
