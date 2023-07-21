//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from '@phosphor-icons/react';
import React, { cloneElement } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { active, Kind, doneActionParent, onDone } = props;

  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Button
      onClick={onDone}
      disabled={disabled}
      classNames='flex items-center gap-2 pli-2'
      data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
      data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check className={getSize(4)} />
    </Button>
  );

  return (
    <>
      <p className='text-center text-sm font-system-normal'>{t('welcome message')}</p>
      <div role='none' className='grow' />
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </>
  );
};
