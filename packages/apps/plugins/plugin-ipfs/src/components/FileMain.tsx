//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
import urlJoin from 'url-join';

import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
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
    <Main.Content classNames={mx('flex flex-col h-screen overflow-hidden', baseSurface)}>
      <FilePreview type={file.type} url={url} />
    </Main.Content>
  );
};

export const FileSection: FC<{ data: TypedObject }> = ({ data: file }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);

  return (
    <div className='p-2 h-[300px]'>
      <FilePreview type={file.type} url={url} />
    </div>
  );
};
