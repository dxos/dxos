//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { FilePreview } from './FilePreview';
import { type FileType } from '../types';

const FileSlide: FC<{ file: FileType; cover?: boolean }> = ({ file, cover }) => {
  const url = 'TODO';

  return (
    <div className='h-full flex justify-center align-center'>
      <FilePreview type={file.type} url={url} classNames={cover ? 'object-cover' : 'object-contain'} />
    </div>
  );
};

export default FileSlide;
