//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ComponentProps, ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

const pinLength = 6;

const PureInvitationAuthenticatorContent = ({
  disabled,
  onChange,
  onAuthenticate
}: {
  disabled?: boolean;
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
        slots={{
          label: { className: 'sr-only' },
          input: {
            inputMode: 'numeric',
            pattern: '\\d*',
            'data-autofocus': 'space invitation acceptor; invitation authenticator'
          } as ComponentPropsWithoutRef<'input'>
        }}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button disabled={disabled} className='grow flex items-center gap-2 pli-2 order-2' onClick={onAuthenticate}>
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('next label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button disabled={disabled} className='flex items-center gap-2 pis-2 pie-4'>
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('cancel label')}</span>
        </Button>
      </div>
    </>
  );
};

const InvitationAuthenticatorContent = ({
  disabled,
  invitation
}: {
  disabled?: boolean;
  invitation: CancellableInvitationObservable;
}) => {
  const [pinValue, setPinValue] = useState('');
  const { authenticate } = useInvitationStatus(invitation);
  const onAuthenticate = useCallback(() => authenticate(pinValue), [authenticate, pinValue]);
  const onChange = useCallback(
    (value: string) => {
      setPinValue(value);
      if (value.length === pinLength) {
        void authenticate(pinValue);
      }
    },
    [authenticate, pinValue]
  );
  return <PureInvitationAuthenticatorContent {...{ disabled, onChange, onAuthenticate }} />;
};

export const InvitationAuthenticator = (viewStateProps: ViewStateProps) => {
  const disabled = !viewStateProps.active;
  const { activeInvitation } = viewStateProps;
  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation || activeInvitation === true ? (
        <PureInvitationAuthenticatorContent {...{ disabled, onChange: () => {}, onAuthenticate: () => {} }} />
      ) : (
        <InvitationAuthenticatorContent {...{ disabled, invitation: activeInvitation }} />
      )}
    </ViewState>
  );
};
