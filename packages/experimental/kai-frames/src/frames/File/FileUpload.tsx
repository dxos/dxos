//
// Copyright 2023 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { getSize } from '@dxos/react-ui-theme';
import { File } from '@dxos/kai-types';

export const FileUpload: FC<{ fileTypes: string[]; onUpload: (file: File) => void }> = ({ fileTypes, onUpload }) => {
  return (
    <div className='hidden md:flex shrink-0 flex-col w-full h-[160px] p-2'>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        classes='flex flex-1 flex-col justify-center w-full h-full border-4 border-dashed rounded-lg'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={onUpload}
      >
        <div className='flex flex-col items-center cursor-pointer'>
          <FilePlus weight='thin' className={getSize(10)} />
          <div className='mt-2'>Click or drag files here.</div>
        </div>
      </FileUploader>
    </div>
  );
};
