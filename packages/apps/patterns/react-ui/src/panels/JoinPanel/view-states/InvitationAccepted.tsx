//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from 'phosphor-react';
import React, { cloneElement } from 'react';

import { InvitationResult, useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
}

export const InvitationAccepted = ({
  invitationType,
  doneActionParent,
  onDone,
  ...viewStateProps
}: InvitationAcceptedProps) => {
  const disabled = !viewStateProps.active;
  const { t } = useTranslation('os');
  const { activeInvitation } = viewStateProps;
  const { result } = activeInvitation
    ? activeInvitation === true
      ? { result: null }
      : useInvitationStatus(activeInvitation)
    : { result: null };

  const doneButton = (
    <Button
      {...(onDone && { onClick: () => onDone(result) })}
      disabled={disabled}
      className='grow flex items-center gap-2 pli-2'
      data-autofocus='space invitation acceptor; invitation accepted'
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return (
    <ViewState {...viewStateProps}>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </ViewState>
  );
};
