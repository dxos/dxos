//
// Copyright 2023 DXOS.org
//

import React, { FC, useState } from 'react';
import urlJoin from 'url-join';

import { Main } from '@dxos/aurora';
import { coarseBlockPaddingStart } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/client/echo';
import { Config, useConfig } from '@dxos/react-client';

import { FilePreview } from './FilePreview';

export const fileTypes = ['jpg', 'png', 'gif', 'pdf'];

const getIpfsUrl = (config: Config, cid: string) => {
  return urlJoin(config.values.runtime!.services!.ipfs!.gateway!, cid);
};

export const FileMain: FC<{ data: TypedObject }> = ({ data: file }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);

  return (
    <Main.Content classNames={['flex flex-col min-bs-[calc(100dvh-2.5rem)] overflow-hidden', coarseBlockPaddingStart]}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export const FileSection: FC<{ data: TypedObject }> = ({ data: file }) => {
  const config = useConfig();
  const [height] = useState<number>(400);
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);

  return (
    <div style={{ height }} className='p-2'>
      <FilePreview type={file.type} url={url} />
    </div>
  );
};
