//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type TypedObject } from '@dxos/client/echo';
import { useConfig } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { FilePreview } from './FilePreview';
import { getIpfsUrl } from '../get-ipfs-url';

const FileMain: FC<{ file: TypedObject }> = ({ file }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export default FileMain;
