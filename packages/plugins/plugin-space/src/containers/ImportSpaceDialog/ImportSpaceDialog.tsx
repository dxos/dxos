//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';

export const ImportSpaceDialog = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const handleFile = useCallback(
    async (file: File) => {
      const contents = new Uint8Array(await file.arrayBuffer());
      const { data: result } = await invokePromise(SpaceOperation.ImportSpace, {
        archive: { filename: file.name, contents },
      });
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      if (result?.space) {
        await invokePromise(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(result.space.id) });
      }
    },
    [invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('import-space-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <p className='my-4'>{t('import-space-dialog.description')}</p>
        <FileUploader
          types={['json', 'tar']}
          classes='block my-4 p-8 border-2 border-dashed border-neutral-500/50 rounded-sm flex items-center justify-center gap-2 cursor-pointer'
          dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
          handleChange={(file: File) => {
            void handleFile(file);
          }}
        >
          <Icon icon='ph--file-plus--duotone' size={8} />
          <span>{t('import-space-dialog.upload.label')}</span>
        </FileUploader>
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button variant='primary'>{t('cancel.label')}</Button>
        </Dialog.Close>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
