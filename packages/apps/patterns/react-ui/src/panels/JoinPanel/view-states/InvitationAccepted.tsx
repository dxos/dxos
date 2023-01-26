//
// Copyright 2023 DXOS.org
//

import { Action as AlertDialogAction } from '@radix-ui/react-alert-dialog';
import { CaretLeft, Check } from 'phosphor-react';
import React from 'react';

import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export const InvitationAccepted = (viewStateProps: ViewStateProps) => {
  const disabled = !viewStateProps.active;
  const { t } = useTranslation('os');

  return (
    <ViewState {...viewStateProps}>
      <AlertDialogAction asChild>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          data-autofocus='space invitation acceptor; invitation accepted'
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('done label')}</span>
          <Check weight='bold' className={getSize(4)} />
        </Button>
      </AlertDialogAction>
    </ViewState>
  );
};
