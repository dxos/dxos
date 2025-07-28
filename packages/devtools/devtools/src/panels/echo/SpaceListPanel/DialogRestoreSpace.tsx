//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { Button, Dialog, Icon } from '@dxos/react-ui';

export const DialogRestoreSpace = ({ handleFile }: { handleFile: (backupFile: File) => Promise<void> }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className='flex shrink-0 m-2'>
      <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => setDialogOpen(nextOpen)}>
        <Dialog.Trigger asChild>
          <Button>Import space</Button>
        </Dialog.Trigger>

        <Dialog.Overlay>
          <Dialog.Content>
            <Dialog.Title>{'Import space'}</Dialog.Title>
            <p className='mlb-4'>{'Importing from a backup will create new space from.'}</p>
            <FileUploader
              types={['json', 'tar']}
              classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
              dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
              handleChange={(backupFile: File) => handleFile(backupFile).finally(() => setDialogOpen(false))}
            >
              <Icon icon='ph--file-plus--duotone' size={8} />
              <span>{'Drag file here or click to browse'}</span>
            </FileUploader>
            <Dialog.Close asChild>
              <Button variant='primary'>{'Cancel'}</Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
    </div>
  );
};
