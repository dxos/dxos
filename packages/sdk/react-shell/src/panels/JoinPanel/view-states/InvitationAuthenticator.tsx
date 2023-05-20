//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ChangeEvent, ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { AuthenticatingInvitationObservable } from '@dxos/client';
import { Input } from '@dxos/react-appkit';
import { useInvitationStatus } from '@dxos/react-client';

import { JoinSend, JoinState } from '../joinMachine';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
  failed?: boolean;
}

const PureInvitationAuthenticatorContent = ({
  disabled,
  failed,
  joinSend,
  joinState,
  Kind,
  onChange,
  onAuthenticate,
}: {
  disabled?: boolean;
  joinSend: JoinSend;
  joinState?: JoinState;
  Kind: InvitationAuthenticatorProps['Kind'];
  failed: InvitationAuthenticatorProps['failed'];
  onChange: ComponentProps<typeof Input>['onChange'];
  onAuthenticate: ComponentProps<typeof Button>['onClick'];
}) => {
  const { t } = useTranslation('os');
  const invitationType = Kind.toLowerCase() as 'space' | 'halo';
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
            'data-autofocus': `connecting${Kind}Invitation inputting${Kind}VerificationCode authenticationFailing${Kind}VerificationCode authenticating${Kind}VerificationCode`,
            'data-prevent-ios-autofocus': true,
            'data-testid': `${invitationType}-auth-code-input`,
            'data-1p-ignore': true,
          } as ComponentPropsWithoutRef<'input'>,
        }}
        {...(failed && {
          validationValence: 'error',
          validationMessage: t('failed to authenticate message'),
        })}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          classNames='grow flex items-center gap-2 pli-2 order-2'
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
          classNames='flex items-center gap-2 pis-2 pie-4'
          onClick={() => joinState?.context[invitationType].invitationObservable?.cancel()}
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
  joinState,
  disabled,
  invitation,
  Kind,
  failed,
}: {
  joinSend: JoinSend;
  joinState?: JoinState;
  disabled?: boolean;
  invitation: AuthenticatingInvitationObservable;
  Kind: InvitationAuthenticatorProps['Kind'];
  failed: InvitationAuthenticatorProps['failed'];
}) => {
  const invitationType = Kind.toLowerCase();
  const [pinValue, setPinValue] = useState('');
  const { authenticate } = useInvitationStatus(invitation);
  const onAuthenticate = useCallback(() => {
    joinSend({ type: `authenticate${Kind}VerificationCode` });
    void authenticate(pinValue);
  }, [joinSend, authenticate, pinValue]);
  const onChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
      setPinValue(value);
      if (value.length === pinLength) {
        (document.querySelector(`[data-autofocus-pinlength="${invitationType}"]`) as HTMLElement | null)?.focus();
      }
    },
    [authenticate, pinValue],
  );
  return (
    <PureInvitationAuthenticatorContent
      {...{ disabled, failed, joinSend, joinState, Kind, onChange, onAuthenticate }}
    />
  );
};

export const InvitationAuthenticator = ({ failed, Kind, ...viewStateProps }: InvitationAuthenticatorProps) => {
  const { joinSend, joinState } = viewStateProps;
  const disabled =
    !viewStateProps.active ||
    ['connecting', 'authenticating'].some((str) => joinState?.configuration[0].id.includes(str));
  const activeInvitation = joinState?.context[Kind.toLowerCase() as 'space' | 'halo'].invitationObservable;
  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation ? (
        <PureInvitationAuthenticatorContent
          {...{ disabled, failed, joinSend, joinState, Kind, onChange: () => {}, onAuthenticate: () => {} }}
        />
      ) : (
        <InvitationAuthenticatorContent
          {...{ disabled, failed, invitation: activeInvitation, joinSend, joinState, Kind }}
        />
      )}
    </ViewState>
  );
};
