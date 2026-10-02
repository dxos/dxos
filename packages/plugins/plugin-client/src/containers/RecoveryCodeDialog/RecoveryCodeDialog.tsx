//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Grid from '@dxos/react-ui/Grid';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemIconButton from '@dxos/react-ui/SystemIconButton';

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
        <Flex.Root column gap='sm' classNames='py-4'>
          <p>{t('recovery-code-dialog-warning-1.message')}</p>
          <p>{t('recovery-code-dialog-warning-2.message')}</p>
        </Flex.Root>
        <Flex.Root gap='sm' align='center' classNames='pb-4'>
          <Field.Checkbox
            data-testid='recoveryCode.confirm'
            checked={confirmation}
            onCheckedChange={handleConfirmation}
          >
            {t('recovery-code-confirmation.label')}
          </Field.Checkbox>
        </Flex.Root>
      </AlertDialog.Body>
      <AlertDialog.ActionBar>
        <AlertDialog.Action asChild>
          <Button.Root data-testid='recoveryCode.continue' variant='primary' disabled={!confirmation}>
            {t('continue.label')}
          </Button.Root>
        </AlertDialog.Action>
      </AlertDialog.ActionBar>
    </AlertDialog.Content>
  );
};

const Code = ({ code }: { code: string }) => {
  const words = code.split(' ');
  return (
    <div className='relative p-2 border border-separator rounded-sm group'>
      <SystemIconButton.Clipboard
        iconOnly
        value={code}
        classNames='absolute top-2 right-2 invisible group-hover:visible'
      />
      <Grid.Root cols={4} grow={false} data-testid='recoveryCode.code' data-code={code}>
        {words.map((word, i) => (
          <Flex.Root key={i} gap='sm' align='center' classNames='p-2'>
            <div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>
            <div className='text-sm'>{word}</div>
          </Flex.Root>
        ))}
      </Grid.Root>
    </div>
  );
};

RecoveryCodeDialog.displayName = 'RecoveryCodeDialog';
