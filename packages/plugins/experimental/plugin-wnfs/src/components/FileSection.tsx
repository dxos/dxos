//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { FilePreview } from './FilePreview';
import { type FileType } from '../types';

const FileSection: FC<{ file: FileType; height?: number }> = ({ file, height = 400 }) => {
  const url = 'TODO';

  return (
    <div style={{ height }} className='flex w-full p-2 justify-center align-center'>
      <FilePreview type={file.type} url={url} classNames='object-contain' />
    </div>
  );
};

export default FileSection;
