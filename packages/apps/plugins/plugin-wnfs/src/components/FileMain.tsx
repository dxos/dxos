//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { FilePreview } from './FilePreview';

const FileMain: FC<{ file: FileType }> = ({ file }) => {
  console.log('FileMain', file);

  const url = 'TODO';

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export default FileMain;
