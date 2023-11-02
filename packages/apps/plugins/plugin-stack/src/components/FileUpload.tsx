//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { type FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { File as FileType } from '@braneframe/types';
import { getSize, mx } from '@dxos/react-ui-theme';

import { useIpfsClient } from '../hooks';

// TODO(burdon): Coordinate with plugin-file.
export const FileUpload: FC<{
  classNames?: string | string[];
  fileTypes: string[];
  onUpload: (file: FileType) => void;
}> = ({ classNames, fileTypes, onUpload }) => {
  const ipfsClient = useIpfsClient();

  const handleUpdate = async (file: File) => {
    const info = await ipfsClient?.add(file);
    if (info) {
      const filename = file.name.split('.')[0];
      onUpload(new FileType({ type: file.type, title: filename, filename, cid: info.path }));
    }
  };

  if (!ipfsClient) {
    return null;
  }

  return (
    <div className={mx('flex shrink-0 flex-col')}>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        classes='flex flex-col grow justify-center w-full h-full'
        dropMessageStyle={{ border: 'none', backgroundColor: '#ffffff' }}
        handleChange={handleUpdate}
      >
        <div className={mx('flex flex-col items-center cursor-pointer', classNames)}>
          <FilePlus weight='light' className={getSize(8)} />
        </div>
      </FileUploader>
    </div>
  );
};
