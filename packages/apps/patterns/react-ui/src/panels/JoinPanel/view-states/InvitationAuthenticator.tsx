//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

const pinLength = 6;

export interface InvitationAuthenticatorProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
}

const PureInvitationAuthenticatorContent = ({
  disabled,
  dispatch,
  invitationType,
  onChange,
  onAuthenticate
}: {
  disabled?: boolean;
  dispatch: ViewStateProps['dispatch'];
  invitationType: InvitationAuthenticatorProps['invitationType'];
  onChange: ComponentProps<typeof Input>['onChange'];
  onAuthenticate: ComponentProps<typeof Button>['onClick'];
}) => {
  const { t } = useTranslation('os');
  return (
    <>
      <Input
        label={t('pin input label')}
        size='pin'
        length={pinLength}
        onChange={onChange}
        disabled={disabled}
        slots={{
          root: { className: 'm-0' },
          label: { className: 'sr-only' },
          input: {
            disabled,
            inputMode: 'numeric',
            pattern: '\\d*',
            'data-autofocus': 'space invitation acceptor; invitation authenticator'
          } as ComponentPropsWithoutRef<'input'>
        }}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2 order-2'
          onClick={onAuthenticate}
          data-autofocus-pinlength
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('next label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={disabled}
          className='flex items-center gap-2 pis-2 pie-4'
          onClick={() => dispatch({ type: 'cancel invitation', from: invitationType })}
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
  invitationType
}: {
  disabled?: boolean;
  invitation: AuthenticatingInvitationObservable;
  dispatch: ViewStateProps['dispatch'];
  invitationType: InvitationAuthenticatorProps['invitationType'];
}) => {
  const [pinValue, setPinValue] = useState('');
  const { authenticate } = useInvitationStatus(invitation);
  const onAuthenticate = useCallback(
    () =>
      authenticate(pinValue).then(
        () => dispatch({ type: 'accepted invitation', from: invitationType }),
        () => dispatch({ type: 'fail invitation', from: invitationType })
      ),
    [dispatch, invitationType, authenticate, pinValue]
  );
  const onChange = useCallback(
    (value: string) => {
      setPinValue(value);
      if (value.length === pinLength) {
        (document.querySelector('[data-autofocus-pinlength]') as HTMLElement | null)?.focus();
      }
    },
    [authenticate, pinValue]
  );
  return <PureInvitationAuthenticatorContent {...{ disabled, dispatch, invitationType, onChange, onAuthenticate }} />;
};

export const InvitationAuthenticator = ({ invitationType, ...viewStateProps }: InvitationAuthenticatorProps) => {
  const disabled = !viewStateProps.active;
  const { activeInvitation, dispatch } = viewStateProps;
  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation || activeInvitation === true ? (
        <PureInvitationAuthenticatorContent
          {...{ disabled, dispatch, invitationType, onChange: () => {}, onAuthenticate: () => {} }}
        />
      ) : (
        <InvitationAuthenticatorContent {...{ disabled, invitation: activeInvitation, dispatch, invitationType }} />
      )}
    </ViewState>
  );
};
