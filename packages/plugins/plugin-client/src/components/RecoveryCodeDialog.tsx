//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { AlertDialog, Button, Clipboard, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../meta';

export type RecoveryCodeDialogProps = {
  code: string;
};

export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {
  const { t } = useTranslation(meta.id);
  const [confirmation, setConfirmation] = useState(false);

  const handleConfirmation = useCallback((checked: boolean) => setConfirmation(checked), []);

  return (
    <AlertDialog.Content classNames='bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <AlertDialog.Title>{t('recovery code dialog title')}</AlertDialog.Title>
      <p className='plb-4'>{t('recovery code dialog description')}</p>
      <Clipboard.Provider>
        <Code code={code} />
      </Clipboard.Provider>
      <div className='flex flex-col plb-4 gap-2'>
        <p>{t('recovery code dialog warning 1')}</p>
        <p>{t('recovery code dialog warning 2')}</p>
      </div>
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

const Code = ({ code }: { code: string }) => {
  const words = code.split(' ');
  return (
    <div className='relative p-2 border border-separator rounded group'>
      <Clipboard.IconButton value={code} classNames='absolute top-2 right-2 invisible group-hover:visible' />
      <div className='grid grid-cols-4'>
        {words.map((word, i) => (
          <div key={i} className='flex items-center p-2 gap-2'>
            <div className='is-4 text-xs text-center text-subdued'>{i + 1}</div>
            <div className='text-sm'>{word}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
