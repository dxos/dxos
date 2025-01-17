//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { StackItem } from '@dxos/react-ui-stack';

import { FilePreview } from './FilePreview';
import { getIpfsUrl } from '../get-ipfs-url';
import { type FileType } from '../types';

const FileContainer = ({ file, role }: { file: FileType; role: string }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <StackItem.Content toolbar={false}>
      <FilePreview type={file.type} url={url} />
    </StackItem.Content>
  );
};

export default FileContainer;
