//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { type AccessTokenType } from '@dxos/schema';

import { SCRIPT_PLUGIN } from '../../meta';

type DeploymentDialogProps = {
  accessToken: AccessTokenType;
  scripts: { label: string; templateId: string }[];
};

export const DeploymentDialog = ({ accessToken, scripts }: DeploymentDialogProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);

  return (
    <Dialog.Content>
      <div className='flex justify-between items-center'>
        <Dialog.Title>{t('deployment dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button density='fine' variant='ghost'>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>
      <div role='none' className='plb-4'>
        {/* TODO: Implement deployment logic and UI. */}
        <p>{t('deployment dialog scripts found message')}</p>
        <ul className='pbs-2'>
          {scripts.map((script) => (
            <li key={script.templateId}>{script.label}</li>
          ))}
        </ul>
      </div>
      <div role='none' className='flex flex-row-reverse gap-1'>
        <Button variant='primary'>{t('deployment dialog deploy functions button label')}</Button>
        <Dialog.Close asChild>
          <Button>{t('deployment dialog skip button label')}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};

export default DeploymentDialog;
