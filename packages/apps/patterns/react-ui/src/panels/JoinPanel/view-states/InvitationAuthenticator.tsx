//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ChangeEvent, ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { JoinSend } from '../joinMachine';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends ViewStateProps {
  Domain: 'Space' | 'Halo';
  failed?: boolean;
}

const PureInvitationAuthenticatorContent = ({
  disabled,
  failed,
  joinSend,
  Domain,
  onChange,
  onAuthenticate
}: {
  disabled?: boolean;
  joinSend: JoinSend;
  Domain: InvitationAuthenticatorProps['Domain'];
  failed: InvitationAuthenticatorProps['failed'];
  onChange: ComponentProps<typeof Input>['onChange'];
  onAuthenticate: ComponentProps<typeof Button>['onClick'];
}) => {
  const { t } = useTranslation('os');
  const invitationType = Domain.toLowerCase();
  return (
    <>
      <Input
        label={<ViewStateHeading>{t('auth code input label')}</ViewStateHeading>}
        size='pin'
        length={pinLength}
        onChange={onChange}
        disabled={disabled}
        slots={{
          root: { className: 'm-0' },
          description: { className: 'text-center' },
          input: {
            disabled,
            inputMode: 'numeric',
            autoComplete: 'off',
            pattern: '\\d*',
            'data-autofocus': `connecting${Domain}Invitation inputting${Domain}VerificationCode authenticationFailing${Domain}VerificationCode authenticating${Domain}VerificationCode`,
            'data-testid': `${invitationType}-auth-code-input`,
            'data-1p-ignore': true
          } as ComponentPropsWithoutRef<'input'>
        }}
        {...(failed && {
          validationValence: 'error',
          validationMessage: t('failed to authenticate message')
        })}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2 order-2'
          onClick={onAuthenticate}
          data-autofocus-pinlength={invitationType}
          data-testid={`${invitationType}-invitation-authenticator-next`}
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('next label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={disabled}
          className='flex items-center gap-2 pis-2 pie-4'
          onClick={() => joinSend({ type: `fail${Domain}Invitation`, reason: 'cancelled' })}
          data-testid={`${invitationType}-invitation-authenticator-cancel`}
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('cancel label')}</span>
        </Button>
      </div>
    </>
  );
};

const InvitationAuthenticatorContent = ({
  joinSend,
  disabled,
  invitation,
  Domain,
  failed
}: {
  joinSend: JoinSend;
  disabled?: boolean;
  invitation: AuthenticatingInvitationObservable;
  Domain: InvitationAuthenticatorProps['Domain'];
  failed: InvitationAuthenticatorProps['failed'];
}) => {
  const invitationType = Domain.toLowerCase();
  const [pinValue, setPinValue] = useState('');
  const { authenticate } = useInvitationStatus(invitation);
  const onAuthenticate = useCallback(() => {
    joinSend({ type: `authenticate${Domain}VerificationCode` });
    void authenticate(pinValue);
  }, [joinSend, authenticate, pinValue]);
  const onChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
      setPinValue(value);
      if (value.length === pinLength) {
        (document.querySelector(`[data-autofocus-pinlength="${invitationType}"]`) as HTMLElement | null)?.focus();
      }
    },
    [authenticate, pinValue]
  );
  return <PureInvitationAuthenticatorContent {...{ disabled, failed, joinSend, Domain, onChange, onAuthenticate }} />;
};

export const InvitationAuthenticator = ({ failed, Domain, ...viewStateProps }: InvitationAuthenticatorProps) => {
  const { joinSend, joinState } = viewStateProps;
  const disabled =
    !viewStateProps.active ||
    ['connecting', 'authenticating'].some((str) => joinState?.configuration[0].id.includes(str));
  const activeInvitation = joinState?.context[Domain.toLowerCase() as 'space' | 'halo'].invitation;
  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation ? (
        <PureInvitationAuthenticatorContent
          {...{ disabled, failed, joinSend, Domain, onChange: () => {}, onAuthenticate: () => {} }}
        />
      ) : (
        <InvitationAuthenticatorContent {...{ disabled, failed, invitation: activeInvitation, joinSend, Domain }} />
      )}
    </ViewState>
  );
};
