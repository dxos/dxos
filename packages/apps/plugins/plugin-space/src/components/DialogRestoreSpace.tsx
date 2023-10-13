//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useSplitView } from '@braneframe/plugin-splitview';
import { Button, Dialog, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { type Space } from '@dxos/react-client/echo';

import { restoreSpace } from '../backup';
import { SPACE_PLUGIN } from '../types';

export const DialogRestoreSpace = ({ data: [_, space] }: { data: [string, Space] }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const splitView = useSplitView();
  return (
    <>
      <Dialog.Title>{t('confirm restore title')}</Dialog.Title>
      <p className='mlb-4'>{t('confirm restore body')}</p>
      <FileUploader
        types={['zip']}
        classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={(backupFile: File) =>
          restoreSpace(space, backupFile).finally(() => (splitView.dialogOpen = false))
        }
      >
        <FilePlus weight='duotone' className={getSize(8)} />
        <span>{t('upload file message')}</span>
      </FileUploader>
      <Button classNames='block is-full' onClick={() => (splitView.dialogOpen = false)}>
        {t('cancel label', { ns: 'appkit' })}
      </Button>
    </>
  );
};
