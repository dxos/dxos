//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import urlJoin from 'url-join';

import { type TypedObject } from '@dxos/client/echo';
import { type Config, useConfig } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { FilePreview } from './FilePreview';

export const fileTypes = ['jpg', 'png', 'gif', 'pdf'];

const getIpfsUrl = (config: Config, cid: string) => {
  return urlJoin(config.values.runtime!.services!.ipfs!.gateway!, cid);
};

export const FileMain: FC<{ file: TypedObject }> = ({ file }) => {
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

export const FileSection: FC<{ file: TypedObject; height?: number }> = ({ file, height = 400 }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <div style={{ height }} className='flex w-full p-2 justify-center align-center'>
      <FilePreview type={file.type} url={url} className='object-contain' />
    </div>
  );
};

export const FileSlide: FC<{ file: TypedObject; cover?: boolean }> = ({ file, cover }) => {
  const config = useConfig();
  if (!file.cid) {
    return null;
  }

  const url = getIpfsUrl(config, file.cid);
  return (
    <div className='h-full flex justify-center align-center'>
      <FilePreview type={file.type} url={url} className={cover ? 'object-cover' : 'object-contain'} />
    </div>
  );
};
