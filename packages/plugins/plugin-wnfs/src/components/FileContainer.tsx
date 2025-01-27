//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { FilePreview } from './FilePreview';
import { WnfsCapabilities } from '../capabilities';
import { filePath, getBlobUrl, loadWnfs, wnfsUrl } from '../helpers';
import { type FileType } from '../types';

const FileContainer = ({ file, role }: { file: FileType; role: string }) => {
  const blockstore = useCapability(WnfsCapabilities.Blockstore);
  const instances = useCapability(WnfsCapabilities.Instances);
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const space = getSpace(file);
      invariant(space);
      const { directory, forest } = await loadWnfs({ blockstore, instances, space });
      const path = filePath(file.cid.toString(), space);
      const url = await getBlobUrl({ wnfsUrl: wnfsUrl(path), blockstore, directory, forest });
      setBlobUrl(url);
    });

    return () => clearTimeout(timeout);
  }, [file]);

  if (!blobUrl) {
    return null;
  }

  return (
    <StackItem.Content role={role} toolbar={false}>
      <FilePreview type={file.type} url={blobUrl} />
    </StackItem.Content>
  );
};

export default FileContainer;
