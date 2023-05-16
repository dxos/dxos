//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { InvitationResult, Identity, InvitationStatus } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-components';

import { Content, Button, Heading } from '../../Panel';
import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedComponentProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
  screenName?: string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => any;
}

const InvitationAcceptedComponent = ({
  onDone,
  Kind,
  doneActionParent,
  active,
  screenName
}: InvitationAcceptedComponentProps) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Content className='absolute inset-x-0 bottom-0'>
      <Button
        {...(onDone && { onClick: () => onDone?.() })}
        disabled={disabled}
        data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
        data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
      >
        <span className='grow'>{t('dismiss label')}</span>
      </Button>
    </Content>
  );

  return (
    <div role='none' className='h-full relative'>
      <Heading className='mbs-0'>
        {t('welcome message')}
        {screenName ? ', ' + screenName : ''}
      </Heading>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </div>
  );
};

export interface InvitationAcceptedProps extends Omit<InvitationAcceptedComponentProps, 'onDone'> {
  identity?: Identity | null;
  invitationStatus?: InvitationStatus | null;
  onDone?: (result: InvitationResult | null) => any;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { Kind, doneActionParent: _doneActionParent, onDone, invitationStatus, identity, ...viewStateProps } = props;
  return (
    <ViewState {...viewStateProps}>
      <InvitationAcceptedComponent
        {...props}
        screenName={identity?.profile?.displayName}
        onDone={() => onDone?.(invitationStatus?.result ?? null)}
      />
    </ViewState>
  );
};
