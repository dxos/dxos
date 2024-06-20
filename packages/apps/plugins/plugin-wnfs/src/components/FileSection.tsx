//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';

import { FilePreview } from './FilePreview';

const FileSection: FC<{ file: FileType; height?: number }> = ({ file, height = 400 }) => {
  console.log('FileSection', file);

  const url = 'TODO';

  return (
    <div style={{ height }} className='flex w-full p-2 justify-center align-center'>
      <FilePreview type={file.type} url={url} className='object-contain' />
    </div>
  );
};

export default FileSection;
