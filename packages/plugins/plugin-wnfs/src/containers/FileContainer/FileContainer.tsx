//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { Container } from '@dxos/react-ui';

import { FilePreview } from '../../components/FilePreview';
import { filePath, getBlobUrl, loadWnfs, wnfsUrl } from '../../helpers';
import { WnfsCapabilities, type WnfsFile } from '../../types';

export type FileContainerProps = SurfaceComponentProps<WnfsFile.File>;

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
    <Container.Main role={role}>
      <FilePreview type={file.type} url={blobUrl} />
    </Container.Main>
  );
};

export default FileContainer;
