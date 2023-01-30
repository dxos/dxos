//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ChangeEvent, ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
  failed?: boolean;
}

const PureInvitationAuthenticatorContent = ({
  disabled,
  failed,
  dispatch,
  invitationType,
  onChange,
  onAuthenticate
}: {
  disabled?: boolean;
  dispatch: ViewStateProps['dispatch'];
  invitationType: InvitationAuthenticatorProps['invitationType'];
  failed: InvitationAuthenticatorProps['failed'];
  onChange: ComponentProps<typeof Input>['onChange'];
  onAuthenticate: ComponentProps<typeof Button>['onClick'];
}) => {
  const { t } = useTranslation('os');
  return (
    <>
      <Input
        label={t('auth code input label')}
        size='pin'
        length={pinLength}
        onChange={onChange}
        disabled={disabled}
        slots={{
          root: { className: 'm-0' },
          label: { className: 'sr-only' },
          description: { className: 'text-center' },
          input: {
            disabled,
            inputMode: 'numeric',
            pattern: '\\d*',
            'data-autofocus': `${invitationType} invitation acceptor; invitation authenticator`
          } as ComponentPropsWithoutRef<'input'>
        }}
        {...(failed && {
          validationValence: 'error',
          validationMessage: t('failed to authenticate message')
        })}
        data-testid='auth-code-input'
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
          onClick={() => dispatch({ type: 'cancel invitation', from: invitationType })}
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
  disabled,
  invitation,
  dispatch,
  invitationType,
  failed
}: {
  disabled?: boolean;
  invitation: AuthenticatingInvitationObservable;
  dispatch: ViewStateProps['dispatch'];
  invitationType: InvitationAuthenticatorProps['invitationType'];
  failed: InvitationAuthenticatorProps['failed'];
}) => {
  const [pinValue, setPinValue] = useState('');
  const { authenticate } = useInvitationStatus(invitation);
  const onAuthenticate = useCallback(() => {
    dispatch({ type: 'authenticating invitation', from: invitationType });
    void authenticate(pinValue);
  }, [dispatch, invitationType, authenticate, pinValue]);
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
    <PureInvitationAuthenticatorContent {...{ disabled, failed, dispatch, invitationType, onChange, onAuthenticate }} />
  );
};

export const InvitationAuthenticator = ({
  invitationType,
  failed,
  ...viewStateProps
}: InvitationAuthenticatorProps) => {
  const disabled = !viewStateProps.active;
  const { activeInvitation, dispatch } = viewStateProps;
  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation || activeInvitation === true ? (
        <PureInvitationAuthenticatorContent
          {...{ disabled, failed, dispatch, invitationType, onChange: () => {}, onAuthenticate: () => {} }}
        />
      ) : (
        <InvitationAuthenticatorContent
          {...{ disabled, failed, invitation: activeInvitation, dispatch, invitationType }}
        />
      )}
    </ViewState>
  );
};
