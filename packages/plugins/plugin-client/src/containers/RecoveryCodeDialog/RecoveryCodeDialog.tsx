//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Flex, Grid, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

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
    <Next.AlertDialog.Content size='md' classNames='min-h-[15rem]'>
      <Next.AlertDialog.Body>
        <Next.AlertDialog.Title>{t('recovery-code-dialog.title')}</Next.AlertDialog.Title>
        <Next.AlertDialog.Description classNames='py-4'>
          {t('recovery-code-dialog.description')}
        </Next.AlertDialog.Description>
        <Code code={code} />
        <Flex column gap='sm' classNames='py-4'>
          <p>{t('recovery-code-dialog-warning-1.message')}</p>
          <p>{t('recovery-code-dialog-warning-2.message')}</p>
        </Flex>
        <Flex gap='sm' align='center' classNames='pb-4'>
          <Next.Checkbox
            data-testid='recoveryCode.confirm'
            checked={confirmation}
            onCheckedChange={handleConfirmation}
            label={t('recovery-code-confirmation.label')}
          />
        </Flex>
      </Next.AlertDialog.Body>
      <Next.AlertDialog.Footer>
        <Next.AlertDialog.Action asChild>
          <Next.Button data-testid='recoveryCode.continue' variant='primary' disabled={!confirmation}>
            {t('continue.label')}
          </Next.Button>
        </Next.AlertDialog.Action>
      </Next.AlertDialog.Footer>
    </Next.AlertDialog.Content>
  );
};

const Code = ({ code }: { code: string }) => {
  const words = code.split(' ');
  return (
    <div className='relative p-2 border border-separator rounded-sm group'>
      <Next.SystemButton.Clipboard
        iconOnly
        value={code}
        classNames='absolute top-2 right-2 invisible group-hover:visible'
      />
      <Grid cols={4} grow={false} data-testid='recoveryCode.code' data-code={code}>
        {words.map((word, i) => (
          <Flex key={i} gap='sm' align='center' classNames='p-2'>
            <div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>
            <div className='text-sm'>{word}</div>
          </Flex>
        ))}
      </Grid>
    </div>
  );
};

RecoveryCodeDialog.displayName = 'RecoveryCodeDialog';
