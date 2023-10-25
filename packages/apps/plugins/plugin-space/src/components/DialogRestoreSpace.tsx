//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useLayout } from '@braneframe/plugin-layout';
import { type Space } from '@dxos/react-client/echo';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { restoreSpace } from '../backup';
import { SPACE_PLUGIN } from '../types';

export const DialogRestoreSpace = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const layout = useLayout();
  return (
    <>
      <Dialog.Title>{t('confirm restore title')}</Dialog.Title>
      <p className='mlb-4'>{t('confirm restore body')}</p>
      <FileUploader
        types={['zip']}
        classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={(backupFile: File) => restoreSpace(space, backupFile).finally(() => (layout.dialogOpen = false))}
      >
        <FilePlus weight='duotone' className={getSize(8)} />
        <span>{t('upload file message')}</span>
      </FileUploader>
      <Button classNames='block is-full' onClick={() => (layout.dialogOpen = false)}>
        {t('cancel label', { ns: 'appkit' })}
      </Button>
    </>
  );
};
