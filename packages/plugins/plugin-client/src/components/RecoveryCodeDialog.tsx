//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { AlertDialog, Button, Clipboard, Input, useTranslation } from '@dxos/react-ui';

import { CLIENT_PLUGIN } from '../meta';

export type RecoveryCodeDialogProps = {
  code: string;
};

export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const [confirmation, setConfirmation] = useState(false);

  const handleConfirmation = useCallback((checked: boolean) => setConfirmation(checked), []);

  return (
    <AlertDialog.Content classNames='bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <AlertDialog.Title classNames=''>{t('recovery code dialog title')}</AlertDialog.Title>
      <p className='py-4'>{t('recovery code dialog description')}</p>
      <Clipboard.Provider>
        <Code value={code} />
      </Clipboard.Provider>
      <p className='py-4'>{t('recovery code dialog warning')}</p>
      <div className='flex items-center gap-2 pbe-4'>
        <Input.Root>
          <Input.Checkbox
            data-testid='recoveryCode.confirm'
            checked={confirmation}
            onCheckedChange={handleConfirmation}
          />
          <Input.Label>{t('recovery code confirmation label')}</Input.Label>
        </Input.Root>
      </div>
      <div className='flex justify-end'>
        <AlertDialog.Action asChild>
          <Button data-testid='recoveryCode.continue' variant='primary' disabled={!confirmation}>
            {t('continue label')}
          </Button>
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  );
};

// TODO(wittjosiah): Factor out.
const Code = ({ value }: { value: string }) => {
  return (
    <div className='relative p-2 border border-separator rounded group'>
      <Clipboard.IconButton value={value} classNames='absolute top-2 right-2 invisible group-hover:visible' />
      <code className='whitespace-pre-wrap'>{value}</code>
    </div>
  );
};
