//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';

import { FilePreview } from './FilePreview';

const FileSlide: FC<{ file: FileType; cover?: boolean }> = ({ file, cover }) => {
  console.log('FileSlide', file);

  const url = 'TODO';

  return (
    <div className='h-full flex justify-center align-center'>
      <FilePreview type={file.type} url={url} className={cover ? 'object-cover' : 'object-contain'} />
    </div>
  );
};

export default FileSlide;
