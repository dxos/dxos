//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEvent, useState } from 'react';

import { Invitation } from '@dxos/react-client/invitations';
import { Input, useTranslation } from '@dxos/react-ui';
import { descriptionText } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { Action, Actions, Emoji, Label, StepHeading } from '../../../components';
import { translationKey } from '../../../translations';
import { type JoinStepProps } from '../JoinPanelProps';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  authMethod?: Invitation.AuthMethod;
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
      <div role='none' className='grow flex flex-col justify-center gap-4'>
        <Input.Root
          {...(failed && {
            validationValence: 'error',
          })}
        >
          <Input.Label asChild>
            {authMethod === Invitation.AuthMethod.SHARED_SECRET ? (
              <StepHeading>{t('auth code input label')}</StepHeading>
            ) : (
              <>
                <StepHeading className={descriptionText}>{t('authenticating label')}</StepHeading>
                <div role='none' className='grow' />
              </>
            )}
          </Input.Label>
          {authMethod === Invitation.AuthMethod.SHARED_SECRET && (
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
          )}
          {failed && (
            <Input.DescriptionAndValidation classNames='text-center'>
              <Input.Validation>{t('failed to authenticate message')}</Input.Validation>
            </Input.DescriptionAndValidation>
          )}
        </Input.Root>

        {invitationId && authMethod === Invitation.AuthMethod.SHARED_SECRET && (
          <>
            <Label>{t('auth other device emoji message')}</Label>
            <div className='flex justify-center'>
              <Emoji text={hexToEmoji(invitationId)} />
            </div>
          </>
        )}
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
