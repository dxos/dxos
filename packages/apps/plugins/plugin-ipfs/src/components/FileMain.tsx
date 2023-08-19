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

const isImage = (filename: string) => {
  const ext = filename.split('.').at(-1)?.toLowerCase();
  return fileTypes.findIndex((value) => value === ext) !== -1;
};

export const FileMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const config = useConfig();
  if (!object.cid) {
    return null;
  }

  const url = getIpfsUrl(config, object.cid);
  const image = isImage(object.filename);

  return (
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <FilePreview url={url} image={image} />
    </Main.Content>
  );
};

export const FileSection: FC<{ data: TypedObject }> = ({ data: object }) => {
  const config = useConfig();
  if (!object.cid) {
    return null;
  }

  const url = getIpfsUrl(config, object.cid);
  const image = isImage(object.filename);
  console.log(JSON.stringify(object.filename), image);

  return (
    <div className='p-2 h-[300px]'>
      <FilePreview url={url} image={true} />
    </div>
  );
};
