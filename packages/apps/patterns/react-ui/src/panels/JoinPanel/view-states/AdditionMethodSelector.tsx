//
// Copyright 2023 DXOS.org
//

import { Plus, QrCode, Textbox } from '@phosphor-icons/react';
import React from 'react';

import { getSize, useTranslation } from '@dxos/react-components';

import { Heading, Content, Button } from '../../Panel';
import { ViewState, ViewStateProps } from './ViewState';

export type AdditionMethodSelectorProps = ViewStateProps;

export const AdditionMethodSelector = (viewStateProps: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend } = viewStateProps;

  const { t } = useTranslation('os');

  const sharedButtonProps = {
    disabled
    // after: <CaretRight className={getSize(4)} weight='bold' />,
    // slots: { label: { className: 'text-sm' } }
  };
  return (
    <ViewState {...viewStateProps}>
      <Heading className='mbs-0'>{t('addition method selector title')}</Heading>
      {/* <div role='none' className='flex flex-col gap-1 grow'> */}
      <Content>
        <Button
          {...sharedButtonProps}
          // description={t('create identity description')}
          before={<Plus className={getSize(6)} />}
          onClick={() => joinSend({ type: 'createIdentity' })}
          data-autofocus='choosingAuthMethod'
          data-testid='create-identity'
        >
          {t('create identity label')}
        </Button>
        <Button
          {...sharedButtonProps}
          // description={t('join identity description')}
          before={<QrCode className={getSize(6)} />}
          onClick={() => joinSend({ type: 'acceptHaloInvitation' })}
          data-testid='join-identity'
        >
          {t('join identity label')}
        </Button>
        <Button
          {...sharedButtonProps}
          // TODO(mykola): Implement recover.
          disabled={true}
          // description={t('recover identity description')}
          before={<Textbox className={getSize(6)} />}
          onClick={() => joinSend({ type: 'recoverIdentity' })}
          data-testid='recover-identity'
        >
          {t('recover identity label')}
        </Button>
      </Content>
    </ViewState>
  );
};
