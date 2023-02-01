//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from 'phosphor-react';
import React, { cloneElement } from 'react';

import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
}

export const InvitationAccepted = ({
  invitationType,
  doneActionParent,
  ...viewStateProps
}: InvitationAcceptedProps) => {
  const disabled = !viewStateProps.active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Button
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
