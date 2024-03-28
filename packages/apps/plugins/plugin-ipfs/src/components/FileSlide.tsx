//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';
import { useConfig } from '@dxos/react-client';

import { FilePreview } from './FilePreview';
import { getIpfsUrl } from '../get-ipfs-url';

const FileSlide: FC<{ file: FileType; cover?: boolean }> = ({ file, cover }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <div className='h-full flex justify-center align-center'>
      <FilePreview type={file.type} url={url} className={cover ? 'object-cover' : 'object-contain'} />
    </div>
  );
};

export default FileSlide;
