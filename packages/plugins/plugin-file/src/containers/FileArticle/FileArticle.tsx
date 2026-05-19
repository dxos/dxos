//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { FilePreview } from '#components';
import { FileType } from '#types';

export type FileArticleProps = AppSurface.ObjectArticleProps<FileType.FileType>;

export const FileArticle = ({ role, subject: file }: FileArticleProps) => {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file.data) {
      setBlobUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(new Blob([file.data as BlobPart], { type: file.type }));
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file.data, file.type]);

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

export default FileArticle;
