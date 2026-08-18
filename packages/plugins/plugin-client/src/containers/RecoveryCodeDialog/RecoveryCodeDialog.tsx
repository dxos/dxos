//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { AlertDialog, Button, Clipboard, Flex, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type RecoveryCodeDialogProps = {
  code: string;
};

// TODO(burdon): Should have cancel button.
export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [confirmation, setConfirmation] = useState(false);

  const handleConfirmation = useCallback((checked: boolean) => setConfirmation(checked), []);

  return (
    <AlertDialog.Content size='md' classNames='min-h-[15rem]'>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('recovery-code-dialog.title')}</AlertDialog.Title>
        <AlertDialog.Description classNames='py-4'>{t('recovery-code-dialog.description')}</AlertDialog.Description>
        <Clipboard.Provider>
          <Code code={code} />
        </Clipboard.Provider>
        <Flex column gap='sm' classNames='py-4'>
          <p>{t('recovery-code-dialog-warning-1.message')}</p>
          <p>{t('recovery-code-dialog-warning-2.message')}</p>
        </Flex>
        <Flex gap='sm' align='center' classNames='pb-4'>
          <Input.Root>
            <Input.Checkbox
              data-testid='recoveryCode.confirm'
              checked={confirmation}
              onCheckedChange={handleConfirmation}
            />
            <Input.Label>{t('recovery-code-confirmation.label')}</Input.Label>
          </Input.Root>
        </Flex>
      </AlertDialog.Body>
      <AlertDialog.ActionBar>
        <AlertDialog.Action asChild>
          <Button data-testid='recoveryCode.continue' variant='primary' disabled={!confirmation}>
            {t('continue.label')}
          </Button>
        </AlertDialog.Action>
      </AlertDialog.ActionBar>
    </AlertDialog.Content>
  );
};

const Code = ({ code }: { code: string }) => {
  const words = code.split(' ');
  return (
    <div className='relative p-2 border border-separator rounded-sm group'>
      <Clipboard.IconButton value={code} classNames='absolute top-2 right-2 invisible group-hover:visible' />
      <div className='grid grid-cols-4'>
        {words.map((word, i) => (
          <Flex key={i} gap='sm' align='center' classNames='p-2'>
            <div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>
            <div className='text-sm'>{word}</div>
          </Flex>
        ))}
      </div>
    </div>
  );
};

RecoveryCodeDialog.displayName = 'RecoveryCodeDialog';
