//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type FileType } from '@braneframe/types';
import { useConfig } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { FilePreview } from './FilePreview';
import { getIpfsUrl } from '../get-ipfs-url';

const FileMain: FC<{ file: FileType }> = ({ file }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export default FileMain;
