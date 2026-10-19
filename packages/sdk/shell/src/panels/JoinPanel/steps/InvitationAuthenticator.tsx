//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Invitation_AuthMethod } from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Typography from '@dxos/react-ui/Typography';
import { hexToEmoji } from '@dxos/util';

import { Emoji } from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { type JoinStepProps } from '../JoinPanelProps.ts';

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
  const { t } = Hooks.useTranslation(translationKey);
  const invitationType = Kind.toLowerCase() as 'space' | 'halo';
  const [authCode, setAuthCode] = useState('');

  // The pin input reports the whole code; a DOM change event would carry only the digit just typed.
  const handleValueChange = (value: string) => {
    setAuthCode(value);
    if (value.length === pinLength) {
      (document.querySelector(`[data-autofocus-pinlength="${invitationType}"]`) as HTMLElement | null)?.focus();
    }
  };

  return (
    <>
      <Dialog.Body gap='xl' align='center'>
        <Field.Root {...(failed && { validationValence: 'error' })}>
          {authMethod === Invitation_AuthMethod.SHARED_SECRET ? (
            <Field.Label classNames='text-center'>{t('auth-code-input.label')}</Field.Label>
          ) : (
            <Typography.Text tone='muted'>{t('authenticating.label')}</Typography.Text>
          )}
          {authMethod === Invitation_AuthMethod.SHARED_SECRET && (
            <Input.Pin
              {...{
                disabled,
                'size': 'lg',
                'length': pinLength,
                'inputMode': 'numeric',
                'autoComplete': 'off',
                'pattern': '\\d*',
                'onValueChange': handleValueChange,
                'data-autofocus': `connecting${Kind}Invitation inputting${Kind}VerificationCode authenticationFailing${Kind}VerificationCode authenticating${Kind}VerificationCode`,
                'data-prevent-ios-autofocus': true,
                'data-testid': `${invitationType}-auth-code-input`,
                'data-1p-ignore': true,
              }}
            />
          )}
          {failed && <Field.ErrorText classNames='text-center'>{t('failed-to-authenticate.message')}</Field.ErrorText>}
        </Field.Root>
        {invitationId &&
          authMethod === Invitation_AuthMethod.SHARED_SECRET && (
            // One block, so the Body's gap sets it apart from the PIN while the message sits right above its emoji.
            <div className='flex flex-col items-center'>
              <Typography.Text tone='muted'>{t('auth-other-device-emoji.message')}</Typography.Text>
              <Emoji text={hexToEmoji(invitationId)} />
            </div>
          )}
      </Dialog.Body>
      <Dialog.Footer>
        <Button.Root
          variant='ghost'
          disabled={disabled}
          onClick={() => onInvitationCancel?.()}
          data-testid={`${invitationType}-invitation-authenticator-cancel`}
        >
          {t('cancel.label')}
        </Button.Root>
        <Button.Root
          variant='primary'
          disabled={disabled}
          onClick={() => onInvitationAuthenticate?.(authCode)}
          data-autofocus-pinlength={invitationType}
          data-testid={`${invitationType}-invitation-authenticator-next`}
        >
          {t('next.label')}
        </Button.Root>
      </Dialog.Footer>
    </>
  );
};
