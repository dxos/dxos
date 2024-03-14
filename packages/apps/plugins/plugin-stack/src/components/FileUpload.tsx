//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { type FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out. Reconcile with plugin-file.
export const FileUpload: FC<{
  fileTypes: string[];
  onUpload: (file: File) => void;
}> = ({ fileTypes, onUpload }) => {
  return (
    // TODO(burdon): Replace with https://www.npmjs.com/package/react-dropzone
    <Button variant='ghost'>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        dropMessageStyle={{ border: 'none', backgroundColor: 'transparent' }}
        handleChange={onUpload}
      >
        <FilePlus className={getSize(6)} />
      </FileUploader>
    </Button>
  );
};
