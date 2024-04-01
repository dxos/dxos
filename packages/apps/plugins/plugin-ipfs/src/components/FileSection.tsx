//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';
import { useConfig } from '@dxos/react-client';

import { FilePreview } from './FilePreview';
import { getIpfsUrl } from '../get-ipfs-url';

const FileSection: FC<{ file: FileType; height?: number }> = ({ file, height = 400 }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <div style={{ height }} className='flex w-full p-2 justify-center align-center'>
      <FilePreview type={file.type} url={url} className='object-contain' />
    </div>
  );
};

export default FileSection;
