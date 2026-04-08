//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { Panel, useAsyncEffect } from '@dxos/react-ui';

import { FilePreview } from '#components';
import { filePath, getBlobUrl, loadWnfs, wnfsUrl } from '../../helpers';
import { WnfsCapabilities, type WnfsFile } from '#types';

export type FileContainerProps = AppSurface.ObjectArticleProps<WnfsFile.File>;

export const FileContainer = ({ role, subject: file }: FileContainerProps) => {
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
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <FilePreview type={file.type} url={blobUrl} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default FileContainer;
