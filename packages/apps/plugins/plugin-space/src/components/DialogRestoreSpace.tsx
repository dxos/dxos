//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useIntent, LayoutAction } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { restoreSpace } from '../backup';
import { SPACE_PLUGIN } from '../types';

export const DialogRestoreSpace = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatch } = useIntent();
  return (
    <>
      <Dialog.Title>{t('confirm restore title')}</Dialog.Title>
      <p className='mlb-4'>{t('confirm restore body')}</p>
      <FileUploader
        types={['zip']}
        classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={(backupFile: File) =>
          restoreSpace(space, backupFile).finally(() => dispatch({ action: LayoutAction.CLOSE_DIALOG }))
        }
      >
        <FilePlus weight='duotone' className={getSize(8)} />
        <span>{t('upload file message')}</span>
      </FileUploader>
      <Button classNames='block is-full' onClick={() => dispatch({ action: LayoutAction.CLOSE_DIALOG })}>
        {t('cancel label', { ns: 'appkit' })}
      </Button>
    </>
  );
};
