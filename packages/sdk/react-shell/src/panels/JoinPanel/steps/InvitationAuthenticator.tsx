//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ChangeEvent, useState } from 'react';

import { Input, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import { PanelAction, PanelActions, PanelStepHeading } from '../../../components';
import { JoinStepProps } from '../JoinPanelProps';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  failed?: boolean;
  pending?: boolean;
  onInvitationCancel?: () => Promise<void> | undefined;
  onInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
}

export const InvitationAuthenticator = ({
  failed,
  Kind,
  active,
  pending,
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
      <Input.Root
        {...(failed && {
          validationValence: 'error',
        })}
      >
        <Input.Label asChild>
          <PanelStepHeading>{t('auth code input label')}</PanelStepHeading>
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
      <div role='none' className='grow' />
      <PanelActions>
        <PanelAction
          aria-label={t('next label')}
          disabled={disabled}
          classNames='order-2'
          onClick={() => onInvitationAuthenticate?.(authCode)}
          data-autofocus-pinlength={invitationType}
          data-testid={`${invitationType}-invitation-authenticator-next`}
        >
          <CaretRight weight='light' className={getSize(6)} />
        </PanelAction>
        <PanelAction
          aria-label={t('cancel label')}
          disabled={disabled}
          onClick={() => onInvitationCancel?.()}
          data-testid={`${invitationType}-invitation-authenticator-cancel`}
        >
          <CaretLeft weight='light' className={getSize(6)} />
        </PanelAction>
      </PanelActions>
    </>
  );
};
