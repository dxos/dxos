//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { WnfsCapabilities } from '../types';
import { filePath, getBlobUrl, loadWnfs, wnfsUrl } from '../helpers';
import { type WnfsFile } from '../types';

import { FilePreview } from './FilePreview';

export type FileContainerProps = {
  role: string;
  file: WnfsFile.File;
};

export const FileContainer = ({ file }: FileContainerProps) => {
  const blockstore = useCapability(WnfsCapabilities.Blockstore);
  const instances = useCapability(WnfsCapabilities.Instances);
  const [blobUrl, setBlobUrl] = useState<string>();

  useAsyncEffect(async () => {
    const space = getSpace(file);
    invariant(space);
    const { directory, forest } = await loadWnfs({
      blockstore,
      instances,
      space,
    });
    const path = filePath(file.cid.toString(), space);
    const url = await getBlobUrl({
      wnfsUrl: wnfsUrl(path),
      blockstore,
      directory,
      forest,
      type: file.type,
    });
    setBlobUrl(url);
  }, [file]);

  if (!blobUrl) {
    return null;
  }

  return (
    <StackItem.Content>
      <FilePreview type={file.type} url={blobUrl} />
    </StackItem.Content>
  );
};

export default FileContainer;
