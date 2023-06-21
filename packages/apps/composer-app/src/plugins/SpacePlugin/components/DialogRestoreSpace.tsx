//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { Button, Dialog, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { Space } from '@dxos/client';
import { useSplitViewContext } from '@dxos/react-surface';

import { restoreSpace } from '../backup';

export const DialogRestoreSpace = ({ data: [_, space] }: { data: [string, Space] }) => {
  const { t } = useTranslation('composer');
  const splitViewContext = useSplitViewContext();
  return (
    <>
      <Dialog.Title>{t('confirm restore title')}</Dialog.Title>
      <p className='mlb-4'>{t('confirm restore body')}</p>
      <FileUploader
        types={['zip']}
        classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={(backupFile: File) =>
          restoreSpace(space, backupFile).finally(() => (splitViewContext.dialogOpen = false))
        }
      >
        <FilePlus weight='duotone' className={getSize(8)} />
        <span>{t('upload file message')}</span>
      </FileUploader>
      <Button classNames='block is-full' onClick={() => (splitViewContext.dialogOpen = false)}>
        {t('cancel label', { ns: 'appkit' })}
      </Button>
    </>
  );
};
