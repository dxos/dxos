//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';
import urlJoin from 'url-join';

import { type TypedObject } from '@dxos/client/echo';
import { type Config, useConfig } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

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
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
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
      <FilePreview type={file.type} url={url} className='object-contain' />
    </div>
  );
};

export const FileSlide: FC<{ data: TypedObject }> = ({ data: file }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);

  // TODO(burdon): Config object-container/-fit.
  return (
    <div className='h-full'>
      <FilePreview type={file.type} url={url} className='object-fit' />
    </div>
  );
};
