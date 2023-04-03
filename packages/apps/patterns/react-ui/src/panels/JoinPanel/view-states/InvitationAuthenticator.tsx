//
// Copyright 2023 DXOS.org
//

import React, { ChangeEvent, ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Input, useTranslation } from '@dxos/react-components';

import { Content, Heading, Button } from '../../Panel';
import { JoinSend, JoinState } from '../joinMachine';
import { ViewState, ViewStateProps } from './ViewState';

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
  onAuthenticate
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
    <Content className='mbs-0'>
      <Input
        label={<Heading className='mbs-0'>{t('auth code input label')}</Heading>}
        size='pin'
        length={pinLength}
        onChange={onChange}
        disabled={disabled}
        slots={{
          root: { className: 'mbs-0' },
          description: { className: 'text-center' },
          input: {
            disabled,
            className: 'mlb-3',
            inputMode: 'numeric',
            autoComplete: 'off',
            pattern: '\\d*',
            'data-autofocus': `connecting${Kind}Invitation inputting${Kind}VerificationCode authenticationFailing${Kind}VerificationCode authenticating${Kind}VerificationCode`,
            'data-prevent-ios-autofocus': true,
            'data-testid': `${invitationType}-auth-code-input`,
            'data-1p-ignore': true
          } as ComponentPropsWithoutRef<'input'>
        }}
        {...(failed && {
          validationValence: 'error',
          validationMessage: t('failed to authenticate message')
        })}
      />
      <Button
        disabled={disabled}
        onClick={onAuthenticate}
        data-autofocus-pinlength={invitationType}
        data-testid={`${invitationType}-invitation-authenticator-next`}
      >
        <span className='grow'>{t('next label')}</span>
      </Button>
      <Button
        disabled={disabled}
        variant='ghost'
        onClick={() => joinState?.context[invitationType].invitationObservable?.cancel()}
        data-testid={`${invitationType}-invitation-authenticator-cancel`}
      >
        <span>{t('cancel label')}</span>
      </Button>
    </Content>
  );
};

const InvitationAuthenticatorContent = ({
  joinSend,
  joinState,
  disabled,
  invitation,
  Kind,
  failed
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
    [authenticate, pinValue]
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
