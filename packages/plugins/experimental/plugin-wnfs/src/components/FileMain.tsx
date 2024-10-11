//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { FilePreview } from './FilePreview';
import { type FileType } from '../types';

const FileMain: FC<{ file: FileType }> = ({ file }) => {
  const url = 'TODO';

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export default FileMain;
