//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { FilePreview } from './FilePreview';
import { type FileType } from '../types';

const FileContainer = ({ file, role }: { file: FileType; role: string }) => {
  const url = 'TODO';

  return (
    <StackItem.Content toolbar={false}>
      <FilePreview type={file.type} url={url} />
    </StackItem.Content>
  );
};

export default FileContainer;
