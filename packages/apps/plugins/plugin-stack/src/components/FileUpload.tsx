//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { type FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { getSize, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out. Reconcile with plugin-file.
export const FileUpload: FC<{
  classNames?: string | string[];
  fileTypes: string[];
  onUpload: (file: File) => void;
}> = ({ classNames, fileTypes, onUpload }) => {
  return (
    <div className={mx('flex shrink-0 flex-col')}>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        classes='flex flex-col grow justify-center w-full h-full'
        dropMessageStyle={{ border: 'none', backgroundColor: '#ffffff' }}
        handleChange={onUpload}
      >
        <div className={mx('flex flex-col items-center cursor-pointer', classNames)}>
          <FilePlus weight='light' className={getSize(8)} />
        </div>
      </FileUploader>
    </div>
  );
};
