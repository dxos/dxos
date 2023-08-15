//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useIntent } from '@braneframe/plugin-intent';
import { SpaceAction } from '@braneframe/plugin-space';
import { File as FileProto } from '@braneframe/types';
import { getSize, mx } from '@dxos/aurora-theme';

import { useIpfsClient } from '../hooks';

// TODO(burdon): Coordinate with plugin-file.
export const FileUpload: FC<{
  classNames?: string | string[];
  fileTypes: string[];
  onUpload: (file: FileProto) => void;
}> = ({ classNames, fileTypes, onUpload }) => {
  const ipfsClient = useIpfsClient();
  const handleUpdate = async (file: File) => {
    // TODO(burdon): Create and return object; add to stack.
    const info = await ipfsClient?.add(file);
    if (info) {
      const filename = file.name;
      const f = new FileProto({ name: filename, filename, cid: info.path });
      onUpload(f);
    }
  };

  if (!ipfsClient) {
    return null;
  }

  return (
    <div className={mx('hidden md:flex shrink-0 flex-col')}>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        classes='flex flex-col grow justify-center w-full h-full'
        dropMessageStyle={{ border: 'none', backgroundColor: '#ffffff' }}
        handleChange={handleUpdate}
      >
        <div className={mx('flex flex-col items-center cursor-pointer', classNames)}>
          <FilePlus weight='thin' className={getSize(10)} />
        </div>
      </FileUploader>
    </div>
  );
};

// export const StackMain = ({ data }: { data: { object: StackModel & StackProperties } }) => {
export const FileDrop: FC<{}> = () => {
  const { sendIntent } = useIntent();

  return (
    <div className='mb-4'>
      <FileUpload
        classNames='p-2'
        fileTypes={['png']}
        onUpload={(file: FileProto) => {
          console.log('upload', file);
          // TODO(burdon): Must be serialized?
          // TODO(burdon): Need spaceKey.
          sendIntent({ action: SpaceAction.ADD_OBJECT, data: { object: file } });
        }}
      />
    </div>
  );
};
