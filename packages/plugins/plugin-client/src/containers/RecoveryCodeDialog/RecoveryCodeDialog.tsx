//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { meta } from '#meta';

export type RecoveryCodeDialogProps = {
  code: string;
};

// TODO(burdon): Should have cancel button.
export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [confirmation, setConfirmation] = useState(false);

  const handleConfirmation = useCallback((checked: boolean) => setConfirmation(checked), []);

  return (
    <AlertDialog.Content size='md' classNames='min-h-[15rem]'>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('recovery-code-dialog.title')}</AlertDialog.Title>
        <AlertDialog.Description classNames='py-4'>{t('recovery-code-dialog.description')}</AlertDialog.Description>
        <Code code={code} />
        <Layout.Flex column gap='sm' classNames='py-4'>
          <p>{t('recovery-code-dialog-warning-1.message')}</p>
          <p>{t('recovery-code-dialog-warning-2.message')}</p>
        </Layout.Flex>
        <Layout.Flex gap='sm' align='center' classNames='pb-4'>
          <Input.Checkbox
            data-testid='recoveryCode.confirm'
            checked={confirmation}
            onCheckedChange={({ checked }) => handleConfirmation(checked === true)}
            label={t('recovery-code-confirmation.label')}
          />
        </Layout.Flex>
      </AlertDialog.Body>
      <AlertDialog.Footer>
        <AlertDialog.Action data-testid='recoveryCode.continue' variant='primary' disabled={!confirmation}>
          {t('continue.label')}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
};

const Code = ({ code }: { code: string }) => {
  const words = code.split(' ');
  return (
    <div className='relative p-2 border border-separator rounded-sm group'>
      <SystemButton.Clipboard iconOnly value={code} classNames='absolute top-2 right-2 invisible group-hover:visible' />
      <Layout.Grid cols={4} data-testid='recoveryCode.code' data-code={code}>
        {words.map((word, i) => (
          <Layout.Flex key={i} gap='sm' align='center' classNames='p-2'>
            <div className='w-4 text-xs text-center text-fg-subtle'>{i + 1}</div>
            <div className='text-sm'>{word}</div>
          </Layout.Flex>
        ))}
      </Layout.Grid>
    </div>
  );
};

RecoveryCodeDialog.displayName = 'RecoveryCodeDialog';
